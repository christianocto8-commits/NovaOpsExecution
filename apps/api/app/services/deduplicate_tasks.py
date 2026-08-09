from datetime import datetime, time, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.services.timezones import now_local


def deduplicate_existing_schedule_tasks(db: Session) -> dict[str, int]:
    """Find and cancel open/overdue duplicate tasks generated from the same
    TaskSchedule and outlet on the same date where a completed task already exists.
    """
    completed_tasks = (
        db.query(Task)
        .filter(
            Task.schedule_id.isnot(None),
            Task.status == "completed",
        )
        .all()
    )

    cancelled_count = 0

    tz = now_local(db).tzinfo
    for task in completed_tasks:
        created_date = task.created_at.astimezone(tz).date() if task.created_at else now_local(db).date()
        start_of_day = datetime.combine(created_date, time.min, tzinfo=tz)
        end_of_day = start_of_day + datetime.resolution * 86400

        duplicates = (
            db.query(Task)
            .filter(
                Task.schedule_id == task.schedule_id,
                Task.outlet_id == task.outlet_id,
                Task.id != task.id,
                Task.status.in_(["open", "in_progress"]),
                Task.created_at >= start_of_day,
                Task.created_at < end_of_day,
            )
            .all()
        )

        for dup in duplicates:
            dup.status = "cancelled"
            dup.description = (dup.description or "") + f" [Auto-cancelled: Duplicate of completed task #{task.id}]"
            cancelled_count += 1

    db.commit()
    return {"cancelled_duplicates": cancelled_count}
