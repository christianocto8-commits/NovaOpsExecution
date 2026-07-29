"""IoT auto-fail and LMS training gate parity tests."""

from __future__ import annotations

from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.task import Task
from app.modules.lms.models import TrainingCompletion, TrainingModule
from app.schemas.settings import SettingsUpdate
from app.services.workspace_settings import get_workspace_settings, update_workspace_settings


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _first_open_task(db: Session) -> Task | None:
    return db.query(Task).filter(Task.status == "open").order_by(Task.id.asc()).first()


def test_lms_gate_blocks_submit_when_incomplete(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    previous_settings = get_workspace_settings(db)
    stale_modules = (
        db.query(TrainingModule)
        .filter(TrainingModule.title.like("Parity Gate Module%"))
        .all()
    )
    for stale in stale_modules:
        db.query(TrainingCompletion).filter(
            TrainingCompletion.module_id == stale.id
        ).delete(synchronize_session=False)
        db.delete(stale)
    db.commit()

    update_workspace_settings(
        db,
        SettingsUpdate(lms_training_gate_enabled=True, geofence_enabled=False),
    )

    module = client.post(
        "/api/v1/lms/modules",
        headers=auth_headers,
        json={
            "title": "Parity Gate Module",
            "description": "Required training gate test",
            "content_url": "https://example.com/training",
            "duration_minutes": 10,
            "required_for_roles": ["owner", "admin"],
            "expires_days": 30,
            "is_active": True,
        },
    )
    assert module.status_code in {200, 201}

    task = _first_open_task(db)
    if not task:
        pytest.skip("No open task available")

    submit = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "answers_json": {
                "responses": {},
                "operator": {"name": "Tester", "position": "Crew"},
            }
        },
    )

    try:
        assert submit.status_code == 400
        assert "training" in submit.json().get("detail", "").lower()
    finally:
        module_id = UUID(module.json()["id"])
        db.query(TrainingCompletion).filter(
            TrainingCompletion.module_id == module_id
        ).delete(synchronize_session=False)
        db.query(TrainingModule).filter(
            TrainingModule.id == module_id
        ).delete(synchronize_session=False)
        db.commit()
        update_workspace_settings(
            db,
            SettingsUpdate(
                lms_training_gate_enabled=previous_settings.lms_training_gate_enabled,
                geofence_enabled=previous_settings.geofence_enabled,
            ),
        )
