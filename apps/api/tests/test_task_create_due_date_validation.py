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


def test_create_task_rejects_past_due_date(client: TestClient, auth_headers: dict, db: Session):
    previous = _reset_workspace(db, geofence_enabled=False, lms_training_gate_enabled=False)
    try:
        past_due = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        response = client.post(
            "/api/v1/tasks",
            headers={**auth_headers, "X-Outlet-Id": "1"},
            json={
                "title": "Past due task",
                "description": "should be rejected",
                "due_date": past_due,
            },
        )
        assert response.status_code == 400, response.text
        assert "due_date must be in the future" in response.json()["detail"]
    finally:
        _restore(db, previous)


def test_create_task_accepts_future_due_date(client: TestClient, auth_headers: dict, db: Session):
    previous = _reset_workspace(db, geofence_enabled=False, lms_training_gate_enabled=False)
    try:
        future_due = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        response = client.post(
            "/api/v1/tasks",
            headers={**auth_headers, "X-Outlet-Id": "1"},
            json={
                "title": "Future due task",
                "description": "should succeed",
                "due_date": future_due,
            },
        )
        assert response.status_code < 300, response.text
        assert "publish_time" in response.json()
        task_id = response.json()["id"]
        db.execute(Task.__table__.delete().where(Task.id == task_id))
        db.commit()
    finally:
        _restore(db, previous)
