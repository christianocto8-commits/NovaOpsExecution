from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.task_schedule import TaskSchedule
from app.modules.task_schedules.publisher import TaskSchedulePublisher
from app.modules.task_schedules.schemas import TaskScheduleCreate, TaskScheduleUpdate


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

        if "outlet_ids" in update_data:
            schedule.outlet_ids_json = update_data.pop("outlet_ids")

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

        if payload.recurrence == "daily" and not payload.shifts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one shift is required for daily schedules",
            )
