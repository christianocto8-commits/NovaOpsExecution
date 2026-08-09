from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.schemas.settings import SettingsUpdate
from app.services.workspace_settings import get_workspace_settings, update_workspace_settings

from app.modules.tasks.overdue_alerts import process_overdue_task_alerts


def _reset_workspace(db: Session, **kwargs):
    previous = get_workspace_settings(db)
    update_workspace_settings(db, SettingsUpdate(**kwargs))
    return previous


def _restore(db: Session, previous):
    update_workspace_settings(
        db,
        SettingsUpdate(
            geofence_enabled=previous.geofence_enabled,
            lms_training_gate_enabled=previous.lms_training_gate_enabled,
        ),
    )


def _create_overdue_task(db: Session) -> Task:
    task = Task(
        title="Overdue expiry spam test",
        description=None,
        outlet_id=1,
        assigned_to=None,
        created_by=1,
        source_type=None,
        source_id=None,
        priority="medium",
        status="open",
        due_date=datetime.now(timezone.utc) - timedelta(minutes=70),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_overdue_alerts_disabled_when_setting_off(db: Session):
    from app.schemas.settings import SettingsUpdate
    from app.services.workspace_settings import get_workspace_settings, update_workspace_settings

    previous = get_workspace_settings(db)
    update_workspace_settings(db, SettingsUpdate(overdue_alerts=False))
    try:
        task = _create_overdue_task(db)
        result = process_overdue_task_alerts(db)
        db.refresh(task)
        assert result["overdue_tasks"] == 0
        assert result["alerts_created"] == 0
        assert result["expired_tasks"] == 0
        # No expired_at set when the feature is disabled.
        assert task.expired_at is None
    finally:
        db.query(Task).filter(Task.id == task.id).delete(synchronize_session=False)
        db.commit()
        update_workspace_settings(db, SettingsUpdate(overdue_alerts=previous.overdue_alerts))


def test_expired_at_set_only_once_and_no_duplicate_comments(db: Session):
    previous = _reset_workspace(db, geofence_enabled=False, lms_training_gate_enabled=False)
    task = _create_overdue_task(db)
    try:
        assert task.expired_at is None

        process_overdue_task_alerts(db)
        db.refresh(task)
        assert task.expired_at is not None

        expired_comments_after_first = (
            db.query(TaskComment)
            .filter(TaskComment.task_id == task.id, TaskComment.event_type == "overdue_expired")
            .count()
        )
        assert expired_comments_after_first == 1

        # A second scheduler tick must NOT create another "expired" comment.
        first_expired_at = task.expired_at
        process_overdue_task_alerts(db)
        db.refresh(task)

        expired_comments_after_second = (
            db.query(TaskComment)
            .filter(TaskComment.task_id == task.id, TaskComment.event_type == "overdue_expired")
            .count()
        )
        assert expired_comments_after_second == 1
        assert task.expired_at == first_expired_at
    finally:
        db.query(TaskComment).filter(TaskComment.task_id == task.id).delete(synchronize_session=False)
        db.query(Task).filter(Task.id == task.id).delete(synchronize_session=False)
        db.commit()
        _restore(db, previous)
