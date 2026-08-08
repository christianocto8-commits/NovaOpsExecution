"""Tests for cancelling orphaned tasks left behind by deleted schedules."""

from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.task_schedule import TaskSchedule
from app.modules.task_schedules.service import TaskScheduleService


def _create_schedule(db: Session) -> TaskSchedule:
    schedule = TaskSchedule(
        title="Orphan schedule",
        priority="medium",
        recurrence="daily",
        shifts_json=[],
        outlet_ids_json=["1"],
        publish_time="09:00",
        due_time="17:00",
        auto_publish=True,
        is_active=True,
        created_by=1,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def _create_published_task(
    db: Session, schedule_id: int | None, *, status: str = "open"
) -> Task:
    task = Task(
        title="Auto published task",
        outlet_id=1,
        created_by=1,
        priority="medium",
        status=status,
        schedule_id=schedule_id,
    )
    db.add(task)
    db.flush()
    db.add(
        TaskComment(
            task_id=task.id,
            user_id=1,
            comment="Task auto-published from schedule",
            event_type="created",
            new_value="daily",
        )
    )
    db.commit()
    db.refresh(task)
    return task


def test_cancels_task_after_schedule_deleted(db: Session):
    schedule = _create_schedule(db)
    task = _create_published_task(db, schedule.id)
    db.delete(schedule)
    db.commit()

    assert task.status == "open"

    result = TaskScheduleService(db).cancel_orphan_schedule_tasks(limit=50)
    db.refresh(task)

    assert result["cancelled"] == 1
    assert task.status == "cancelled"


def test_cancels_task_whose_schedule_id_was_detached(db: Session):
    schedule = _create_schedule(db)
    db.delete(schedule)
    db.commit()

    # Older builds deleted schedules by detaching schedule_id (NULL).
    task = _create_published_task(db, None)
    assert task.status == "open"

    result = TaskScheduleService(db).cancel_orphan_schedule_tasks(limit=50)
    db.refresh(task)

    assert result["cancelled"] == 1
    assert task.status == "cancelled"


def test_leaves_tasks_of_existing_schedule_untouched(db: Session):
    schedule = _create_schedule(db)
    task = _create_published_task(db, schedule.id)

    result = TaskScheduleService(db).cancel_orphan_schedule_tasks(limit=50)
    db.refresh(task)

    assert result["cancelled"] == 0
    assert task.status == "open"


def test_skips_completed_tasks(db: Session):
    schedule = _create_schedule(db)
    db.delete(schedule)
    db.commit()

    task = _create_published_task(db, None, status="completed")

    result = TaskScheduleService(db).cancel_orphan_schedule_tasks(limit=50)
    db.refresh(task)

    assert result["cancelled"] == 0
    assert task.status == "completed"
