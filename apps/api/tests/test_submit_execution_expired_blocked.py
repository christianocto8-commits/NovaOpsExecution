from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.task import Task
from app.schemas.settings import SettingsUpdate
from app.services.workspace_settings import get_workspace_settings, update_workspace_settings


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


def _create_expired_task(db: Session) -> Task:
    task = Task(
        title="Expired submit test",
        description=None,
        outlet_id=1,
        assigned_to=None,
        created_by=1,
        source_type=None,
        source_id=None,
        priority="medium",
        status="open",
        due_date=datetime.now(timezone.utc) - timedelta(minutes=70),
        expired_at=datetime.now(timezone.utc) - timedelta(seconds=10),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_submit_execution_rejected_for_expired_task(client: TestClient, auth_headers: dict, db: Session):
    previous = _reset_workspace(db, geofence_enabled=False, lms_training_gate_enabled=False)
    task = _create_expired_task(db)
    try:
        response = client.post(
            f"/api/v1/tasks/{task.id}/submit-execution",
            headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
            json={
                "form_template_id": None,
                "answers_json": {"responses": {}},
                "latitude": None,
                "longitude": None,
                "accuracy_m": None,
            },
        )
        assert response.status_code == 400, response.text
        assert "expired" in response.json()["detail"].lower()
    finally:
        db.query(Task).filter(Task.id == task.id).delete(synchronize_session=False)
        db.commit()
        _restore(db, previous)
