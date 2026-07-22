from __future__ import annotations

from calendar import day_name
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.task_schedule import TaskSchedule
from app.services.webhook_dispatcher import dispatch_webhook_event
from app.modules.tasks.identity_bridge import resolve_legacy_outlet_id

SHIFT_LABELS = {
    "morning": "Morning",
    "evening": "Evening",
    "midnight": "Midnight",
}

WEEKDAY_TO_NAME = {index: name.lower() for index, name in enumerate(day_name)}


class TaskSchedulePublisher:
    def __init__(self, db: Session):
        self.db = db

    def process_due_schedules(
        self,
        *,
        now: datetime | None = None,
        schedule_id: int | None = None,
        force: bool = False,
    ) -> dict[str, int]:
        current = now or datetime.now(timezone.utc)
        query = self.db.query(TaskSchedule).filter(TaskSchedule.is_active.is_(True))

        if schedule_id is not None:
            query = query.filter(TaskSchedule.id == schedule_id)

        schedules = query.order_by(TaskSchedule.id.asc()).all()

        schedules_checked = len(schedules)
        schedules_published = 0
        tasks_created = 0
        skipped_duplicates = 0

        for schedule in schedules:
            if not schedule.auto_publish and not force:
                continue

            if not force and not self._should_publish(schedule, current):
                continue

            created, skipped = self._publish_schedule(schedule, current, force=force)
            if created > 0 or force:
                schedule.last_published_at = current
                schedule.next_publish_at = self._compute_next_publish_at(schedule, current)
                schedules_published += 1

                if created > 0:
                    try:
                        dispatch_webhook_event(
                            self.db,
                            event_type="schedule.published",
                            outlet_id=None,
                            payload={
                                "schedule_id": schedule.id,
                                "title": schedule.title,
                                "recurrence": schedule.recurrence,
                                "tasks_created": created,
                                "outlet_ids": schedule.outlet_ids_json or [],
                                "form_template_id": schedule.form_template_id,
                                "assigned_to": schedule.assigned_to,
                            },
                        )
                    except Exception:
                        pass

            tasks_created += created
            skipped_duplicates += skipped

        self.db.commit()
        return {
            "schedules_checked": schedules_checked,
            "schedules_published": schedules_published,
            "tasks_created": tasks_created,
            "skipped_duplicates": skipped_duplicates,
        }

    def _should_publish(self, schedule: TaskSchedule, current: datetime) -> bool:
        if schedule.recurrence == "daily":
            return self._is_past_due_time(schedule.due_time, current)

        if schedule.recurrence == "weekly":
            if not schedule.weekly_publish_day:
                return False

            current_day = WEEKDAY_TO_NAME[current.weekday()]
            if current_day != schedule.weekly_publish_day.lower():
                return False

            return self._is_past_due_time(schedule.due_time, current)

        if schedule.recurrence == "monthly":
            if not schedule.monthly_publish_day:
                return False

            publish_day = min(schedule.monthly_publish_day, 28)
            if current.day != publish_day:
                return False

            return self._is_past_due_time(schedule.due_time, current)

        return False

    def _is_past_due_time(self, due_time: str, current: datetime) -> bool:
        try:
            hour, minute = [int(part) for part in due_time.split(":")]
        except (TypeError, ValueError):
            hour, minute = 9, 0

        publish_time = time(hour=hour, minute=minute)
        return current.time() >= publish_time

    def _publish_schedule(
        self,
        schedule: TaskSchedule,
        current: datetime,
        *,
        force: bool,
    ) -> tuple[int, int]:
        created = 0
        skipped = 0
        outlet_ids = [str(outlet_id) for outlet_id in (schedule.outlet_ids_json or [])]

        if schedule.recurrence == "weekly":
            for outlet_ref in outlet_ids:
                if self._task_exists(schedule, outlet_ref, None, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, None, current):
                    created += 1
            return created, skipped

        if schedule.recurrence == "monthly":
            for outlet_ref in outlet_ids:
                if self._task_exists(schedule, outlet_ref, None, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, None, current):
                    created += 1
            return created, skipped

        shifts = schedule.shifts_json or ["morning"]
        for outlet_ref in outlet_ids:
            for shift in shifts:
                if self._task_exists(schedule, outlet_ref, shift, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, shift, current):
                    created += 1

        return created, skipped

    def _task_exists(
        self,
        schedule: TaskSchedule,
        outlet_ref: str,
        shift: str | None,
        current: datetime,
        *,
        force: bool,
    ) -> bool:
        if force:
            return False

        try:
            outlet_id = resolve_legacy_outlet_id(self.db, outlet_ref)
        except ValueError:
            return True

        query = self.db.query(Task.id).filter(
            Task.schedule_id == schedule.id,
            Task.outlet_id == outlet_id,
        )

        if shift:
            query = query.filter(Task.shift == shift)

        if schedule.recurrence == "weekly":
            week_start = current.date() - timedelta(days=current.weekday())
            query = query.filter(func.date(Task.created_at) >= week_start)
        elif schedule.recurrence == "monthly":
            query = query.filter(
                func.extract("year", Task.created_at) == current.year,
                func.extract("month", Task.created_at) == current.month,
            )
        else:
            query = query.filter(func.date(Task.created_at) == current.date())

        return query.first() is not None

    def _create_task(
        self,
        schedule: TaskSchedule,
        outlet_ref: str,
        shift: str | None,
        current: datetime,
    ) -> bool:
        try:
            outlet_id = resolve_legacy_outlet_id(self.db, outlet_ref)
        except ValueError:
            return False

        due_date = self._build_due_date(schedule, shift, current)
        title = schedule.title
        if shift:
            title = f"{schedule.title} ({SHIFT_LABELS.get(shift, shift.title())})"

        task = Task(
            title=title[:150],
            description=schedule.description,
            outlet_id=outlet_id,
            assigned_to=schedule.assigned_to,
            created_by=schedule.created_by,
            source_type="form_template" if schedule.form_template_id else "task_schedule",
            source_id=schedule.form_template_id or schedule.id,
            priority=schedule.priority,
            status="open",
            due_date=due_date,
            schedule_id=schedule.id,
            shift=shift,
        )
        self.db.add(task)
        self.db.flush()

        self.db.add(
            TaskComment(
                task_id=task.id,
                user_id=schedule.created_by,
                comment="Task auto-published from schedule",
                event_type="created",
                new_value=schedule.recurrence,
            )
        )
        return True

    def _build_due_date(
        self,
        schedule: TaskSchedule,
        shift: str | None,
        current: datetime,
    ) -> datetime:
        due_time = schedule.due_time
        if shift == "morning":
            due_time = "07:00"
        elif shift == "evening":
            due_time = "15:00"
        elif shift == "midnight":
            due_time = "23:00"

        try:
            hour, minute = [int(part) for part in due_time.split(":")]
        except (TypeError, ValueError):
            hour, minute = 9, 0

        return datetime(
            year=current.year,
            month=current.month,
            day=current.day,
            hour=hour,
            minute=minute,
            tzinfo=timezone.utc,
        )

    def _compute_next_publish_at(self, schedule: TaskSchedule, current: datetime) -> datetime:
        if schedule.recurrence == "weekly":
            days_ahead = 7
        elif schedule.recurrence == "monthly":
            if current.month == 12:
                next_day = current.replace(year=current.year + 1, month=1, day=1)
            else:
                next_day = current.replace(month=current.month + 1, day=1)
            publish_day = min(schedule.monthly_publish_day or 1, 28)
            next_day = next_day.replace(day=publish_day)
            try:
                hour, minute = [int(part) for part in schedule.due_time.split(":")]
            except (TypeError, ValueError):
                hour, minute = 9, 0

            return datetime(
                year=next_day.year,
                month=next_day.month,
                day=next_day.day,
                hour=hour,
                minute=minute,
                tzinfo=timezone.utc,
            )
        else:
            days_ahead = 1

        next_day = current + timedelta(days=days_ahead)
        try:
            hour, minute = [int(part) for part in schedule.due_time.split(":")]
        except (TypeError, ValueError):
            hour, minute = 9, 0

        return datetime(
            year=next_day.year,
            month=next_day.month,
            day=next_day.day,
            hour=hour,
            minute=minute,
            tzinfo=timezone.utc,
        )
