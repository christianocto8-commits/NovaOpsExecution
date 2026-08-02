from __future__ import annotations

from calendar import day_name
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.task_schedule import TaskSchedule
from app.models.task_schedule_exception import TaskScheduleException
from app.modules.notifications.task_notifications import (
    notify_task_incoming_recipients,
    notify_task_schedule_upcoming_recipients,
    resolve_identity_user_id,
)
from app.services.workspace_settings import get_workspace_settings
from app.services.webhook_dispatcher import dispatch_webhook_event
from app.modules.tasks.identity_bridge import resolve_legacy_outlet_id
from app.modules.task_schedules.schedule_timing import (
    build_due_datetime,
    resolve_due_time,
    resolve_publish_time,
    should_publish_recurring,
)

SHIFT_LABELS = {
    "morning": "Morning",
    "evening": "Evening",
    "midnight": "Midnight",
}

WEEKDAY_TO_NAME = {index: name.lower() for index, name in enumerate(day_name)}


class TaskSchedulePublisher:
    def __init__(self, db: Session):
        self.db = db
        self._timezone: ZoneInfo | None = None

    def _workspace_timezone(self) -> ZoneInfo:
        if self._timezone is not None:
            return self._timezone

        settings = get_workspace_settings(self.db)
        try:
            self._timezone = ZoneInfo(settings.timezone or "Asia/Jakarta")
        except ZoneInfoNotFoundError:
            self._timezone = ZoneInfo("Asia/Jakarta")

        return self._timezone

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
        skipped_exceptions = 0
        upcoming_notifications_sent = 0

        for schedule in schedules:
            if not schedule.auto_publish and not force:
                continue

            if not force:
                upcoming_notifications_sent += self._notify_upcoming_schedule(schedule, current)

            if not force and not self._should_publish(schedule, current):
                continue

            created, skipped, skipped_by_exception = self._publish_schedule(schedule, current, force=force)
            if created > 0 or force:
                schedule.last_published_at = current
                if schedule.recurrence == "once":
                    schedule.is_active = False
                    schedule.next_publish_at = None
                else:
                    schedule.next_publish_at = self.compute_next_publish_at(schedule, current)
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
            skipped_exceptions += skipped_by_exception

        self.db.commit()
        return {
            "schedules_checked": schedules_checked,
            "schedules_published": schedules_published,
            "tasks_created": tasks_created,
            "skipped_duplicates": skipped_duplicates,
            "skipped_exceptions": skipped_exceptions,
            "upcoming_notifications_sent": upcoming_notifications_sent,
        }

    def _should_publish(self, schedule: TaskSchedule, current: datetime) -> bool:
        if schedule.recurrence == "once":
            return bool(schedule.next_publish_at and schedule.next_publish_at <= current)

        local_current = current.astimezone(self._workspace_timezone())
        publish_time = self._schedule_publish_time(schedule)
        return should_publish_recurring(
            recurrence=schedule.recurrence,
            publish_time=publish_time,
            local_current=local_current,
            weekly_publish_day=schedule.weekly_publish_day,
            monthly_publish_day=schedule.monthly_publish_day,
            weekday_to_name=WEEKDAY_TO_NAME,
        )

    def _schedule_publish_time(self, schedule: TaskSchedule) -> str:
        return resolve_publish_time(getattr(schedule, "publish_time", None), schedule.due_time)

    def _publish_schedule(
        self,
        schedule: TaskSchedule,
        current: datetime,
        *,
        force: bool,
    ) -> tuple[int, int, int]:
        created = 0
        skipped = 0
        skipped_by_exception = 0
        outlet_ids = [str(outlet_id) for outlet_id in (schedule.outlet_ids_json or [])]

        if schedule.recurrence == "once":
            for outlet_ref in outlet_ids:
                if self._task_exists(schedule, outlet_ref, None, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, None, current):
                    created += 1
            return created, skipped, skipped_by_exception

        if schedule.recurrence == "weekly":
            for outlet_ref in outlet_ids:
                if self._is_exception_day(outlet_ref, current):
                    skipped_by_exception += 1
                    continue
                if self._task_exists(schedule, outlet_ref, None, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, None, current):
                    created += 1
            return created, skipped, skipped_by_exception

        if schedule.recurrence == "monthly":
            for outlet_ref in outlet_ids:
                if self._is_exception_day(outlet_ref, current):
                    skipped_by_exception += 1
                    continue
                if self._task_exists(schedule, outlet_ref, None, current, force=force):
                    skipped += 1
                    continue

                if self._create_task(schedule, outlet_ref, None, current):
                    created += 1
            return created, skipped, skipped_by_exception

        # Daily: one task per outlet (no shift fan-out). Publish/due times are explicit.
        for outlet_ref in outlet_ids:
            if self._is_exception_day(outlet_ref, current):
                skipped_by_exception += 1
                continue
            if self._task_exists(schedule, outlet_ref, None, current, force=force):
                skipped += 1
                continue

            if self._create_task(schedule, outlet_ref, None, current):
                created += 1

        return created, skipped, skipped_by_exception

    def _is_exception_day(self, outlet_ref: str, current: datetime) -> bool:
        try:
            outlet_id = resolve_legacy_outlet_id(self.db, outlet_ref)
        except ValueError:
            return True

        return (
            self.db.query(TaskScheduleException.id)
            .filter(TaskScheduleException.date == current.date())
            .filter(
                (TaskScheduleException.outlet_id.is_(None))
                | (TaskScheduleException.outlet_id == outlet_id)
            )
            .first()
            is not None
        )

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

        if schedule.recurrence == "once":
            query = query.filter(Task.schedule_id == schedule.id)
        elif schedule.recurrence == "weekly":
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

        assigned_identity_user_id = resolve_identity_user_id(self.db, schedule.assigned_to)
        notify_task_incoming_recipients(
            self.db,
            task=task,
            event_type="task_scheduled_incoming",
            excluded_identity_user_ids=(
                {assigned_identity_user_id} if assigned_identity_user_id else None
            ),
        )
        return True

    def _build_due_date(
        self,
        schedule: TaskSchedule,
        shift: str | None,
        current: datetime,
    ) -> datetime:
        del shift  # shift category removed from publish/due semantics
        if schedule.recurrence == "once" and schedule.one_time_due_at:
            return schedule.one_time_due_at

        tz = self._workspace_timezone()
        local_current = current.astimezone(tz)
        local_due_date = build_due_datetime(
            local_current=local_current,
            publish_time=self._schedule_publish_time(schedule),
            due_time=resolve_due_time(schedule.due_time),
            tz=tz,
        )
        return local_due_date.astimezone(timezone.utc)

    def _notify_upcoming_schedule(self, schedule: TaskSchedule, current: datetime) -> int:
        publish_at = (
            schedule.next_publish_at
            if schedule.recurrence == "once" and schedule.next_publish_at
            else self.compute_next_publish_at(schedule, current)
        )
        if publish_at <= current:
            return 0

        if publish_at - current > timedelta(hours=24):
            return 0

        sent = 0
        for outlet_ref, shift in self.expand_schedule_targets(schedule):
            try:
                outlet_id = resolve_legacy_outlet_id(self.db, outlet_ref)
            except ValueError:
                continue

            sent += notify_task_schedule_upcoming_recipients(
                self.db,
                schedule=schedule,
                outlet_id=outlet_id,
                outlet_ref=outlet_ref,
                publish_at=publish_at,
                shift=shift,
            )

        return sent

    def expand_schedule_targets(self, schedule: TaskSchedule) -> list[tuple[str, str | None]]:
        outlet_ids = [str(outlet_id) for outlet_id in (schedule.outlet_ids_json or [])]
        return [(outlet_ref, None) for outlet_ref in outlet_ids]

    def compute_next_publish_at(self, schedule: TaskSchedule, current: datetime) -> datetime:
        if schedule.recurrence == "once" and schedule.next_publish_at:
            return schedule.next_publish_at

        local_current = current.astimezone(self._workspace_timezone())

        try:
            hour, minute = [int(part) for part in self._schedule_publish_time(schedule).split(":")]
        except (TypeError, ValueError):
            hour, minute = 9, 0

        if schedule.recurrence == "weekly":
            target_day = schedule.weekly_publish_day.lower() if schedule.weekly_publish_day else "monday"
            target_index = {name.lower(): index for index, name in enumerate(day_name)}.get(target_day, 0)
            days_ahead = (target_index - local_current.weekday()) % 7
            candidate_day = local_current + timedelta(days=days_ahead)
            candidate = datetime(
                year=candidate_day.year,
                month=candidate_day.month,
                day=candidate_day.day,
                hour=hour,
                minute=minute,
                tzinfo=self._workspace_timezone(),
            )
            if candidate <= local_current:
                candidate += timedelta(days=7)
            return candidate.astimezone(timezone.utc)

        if schedule.recurrence == "monthly":
            publish_day = min(schedule.monthly_publish_day or 1, 28)
            candidate = datetime(
                year=local_current.year,
                month=local_current.month,
                day=publish_day,
                hour=hour,
                minute=minute,
                tzinfo=self._workspace_timezone(),
            )
            if candidate > local_current:
                return candidate.astimezone(timezone.utc)

            if local_current.month == 12:
                next_day = local_current.replace(year=local_current.year + 1, month=1, day=1)
            else:
                next_day = local_current.replace(month=local_current.month + 1, day=1)

            next_candidate = datetime(
                year=next_day.year,
                month=next_day.month,
                day=publish_day,
                hour=hour,
                minute=minute,
                tzinfo=self._workspace_timezone(),
            )
            return next_candidate.astimezone(timezone.utc)

        candidate = datetime(
            year=local_current.year,
            month=local_current.month,
            day=local_current.day,
            hour=hour,
            minute=minute,
            tzinfo=self._workspace_timezone(),
        )
        if candidate <= local_current:
            candidate += timedelta(days=1)
        return candidate.astimezone(timezone.utc)
