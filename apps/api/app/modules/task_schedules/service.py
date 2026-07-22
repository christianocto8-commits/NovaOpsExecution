from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.task_schedule import TaskSchedule
from app.modules.task_schedules.publisher import TaskSchedulePublisher
from app.modules.task_schedules.schemas import TaskScheduleCreate, TaskScheduleUpdate
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.identity_bridge import resolve_legacy_outlet_id


class TaskScheduleService:
    def __init__(self, db: Session):
        self.db = db
        self.publisher = TaskSchedulePublisher(db)

    def list_schedules(self) -> list[TaskSchedule]:
        return self.db.query(TaskSchedule).order_by(TaskSchedule.id.desc()).all()

    def get_schedule(self, schedule_id: int) -> TaskSchedule:
        schedule = self.db.query(TaskSchedule).filter(TaskSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task schedule not found")
        return schedule

    def create_schedule(self, payload: TaskScheduleCreate, actor_id: int) -> TaskSchedule:
        self._validate_payload(payload)

        schedule = TaskSchedule(
            title=payload.title.strip(),
            description=payload.description,
            form_template_id=payload.form_template_id,
            priority=payload.priority,
            recurrence=payload.recurrence,
            shifts_json=payload.shifts,
            outlet_ids_json=payload.outlet_ids,
            due_time=payload.due_time,
            weekly_publish_day=payload.weekly_publish_day,
            monthly_publish_day=payload.monthly_publish_day,
            assigned_to=payload.assigned_to,
            auto_publish=payload.auto_publish,
            is_active=True,
            created_by=actor_id,
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)

        if schedule.auto_publish:
            self.publisher.process_due_schedules(schedule_id=schedule.id, force=True)

        return schedule

    def update_schedule(
        self,
        schedule_id: int,
        payload: TaskScheduleUpdate,
    ) -> TaskSchedule:
        schedule = self.get_schedule(schedule_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "shifts" in update_data:
            schedule.shifts_json = update_data.pop("shifts")

        next_outlet_ids = schedule.outlet_ids_json or []
        if "outlet_ids" in update_data:
            next_outlet_ids = update_data.pop("outlet_ids")
            schedule.outlet_ids_json = next_outlet_ids

        next_assigned_to = update_data.get("assigned_to", schedule.assigned_to)
        if next_assigned_to and (
            "assigned_to" in update_data or "outlet_ids" in payload.model_dump(exclude_unset=True)
        ):
            self._validate_assignee(next_assigned_to, next_outlet_ids)

        for key, value in update_data.items():
            setattr(schedule, key, value)

        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def delete_schedule(self, schedule_id: int) -> None:
        schedule = self.get_schedule(schedule_id)
        self.db.delete(schedule)
        self.db.commit()

    def process_due_schedules(self, schedule_id: int | None = None, force: bool = False) -> dict[str, int]:
        return self.publisher.process_due_schedules(schedule_id=schedule_id, force=force)

    def _validate_payload(self, payload: TaskScheduleCreate) -> None:
        if payload.recurrence == "weekly" and not payload.weekly_publish_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="weekly_publish_day is required for weekly schedules",
            )

        if payload.recurrence == "monthly" and not payload.monthly_publish_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="monthly_publish_day is required for monthly schedules",
            )

        if payload.recurrence == "daily" and not payload.shifts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one shift is required for daily schedules",
            )

        if payload.assigned_to:
            self._validate_assignee(payload.assigned_to, payload.outlet_ids)

    def _validate_assignee(self, assigned_to: int, outlet_ids: list[str]) -> None:
        repo = TaskRepository(self.db)

        for outlet_ref in outlet_ids:
            try:
                outlet_id = resolve_legacy_outlet_id(self.db, outlet_ref)
            except ValueError:
                continue

            if repo.get_outlet_member(outlet_id, assigned_to):
                return

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user is not an active member of the selected outlets",
        )
