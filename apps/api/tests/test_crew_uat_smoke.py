"""Crew UAT smoke tests — geofence, optional execution note, push endpoint.

Automated coverage for PILOT_UAT_CHECKLIST sections 4, 5, and push (4.7).
See docs/PILOT_UAT_CHECKLIST.md and docs/UAT_RESULTS_LOCAL_20260722.md.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.task import Task
from app.schemas.settings import SettingsUpdate
from app.services.workspace_settings import update_workspace_settings


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_template_and_task(db: Session, *, outlet_id: int = 1) -> tuple[int, int, Task]:
    template = FormTemplate(
        title="Crew UAT Smoke Template",
        description="Template for crew UAT smoke tests",
        form_type="test",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    field = FormField(
        form_template_id=template.id,
        label="Equipment checked",
        field_type="yes_no",
        is_required=True,
        sort_order=0,
    )
    db.add(field)

    task = Task(
        title="Crew UAT smoke task",
        description="Task for crew UAT smoke tests",
        outlet_id=outlet_id,
        assigned_to=None,
        created_by=1,
        source_type="form_template",
        source_id=template.id,
        priority="medium",
        status="open",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    db.refresh(field)
    return template.id, field.id, task


def _enable_geofence(db: Session, *, radius_meters: int = 200) -> None:
    update_workspace_settings(
        db,
        SettingsUpdate(
            geofence_enabled=True,
            geofence_radius_meters=radius_meters,
            lms_training_gate_enabled=False,
        ),
    )


def _set_outlet_location(db: Session, outlet_id: int, *, lat: float, lon: float) -> None:
    outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    assert outlet is not None
    outlet.latitude = lat
    outlet.longitude = lon
    db.commit()


def test_crew_geofence_rejects_outside_radius(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template_id, field_id, task = _create_template_and_task(db)
    _enable_geofence(db)
    _set_outlet_location(db, task.outlet_id, lat=-6.200000, lon=106.816666)

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "form_template_id": template_id,
            "latitude": -6.210000,
            "longitude": 106.830000,
            "accuracy_m": 15.0,
            "answers_json": {
                "operator": {"name": "Crew Pilot", "position": "Crew"},
                "note": "Outside geofence",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 400
    assert "from the outlet" in response.json()["detail"]


def test_crew_geofence_accepts_within_radius(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template_id, field_id, task = _create_template_and_task(db)
    _enable_geofence(db)
    _set_outlet_location(db, task.outlet_id, lat=-6.200000, lon=106.816666)

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "form_template_id": template_id,
            "latitude": -6.200050,
            "longitude": 106.816700,
            "accuracy_m": 12.5,
            "answers_json": {
                "operator": {"name": "Crew Pilot", "position": "Crew"},
                "note": "Within geofence",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["task"]["id"] == task.id


def test_crew_optional_execution_note_when_template_opted_out(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    update_workspace_settings(
        db,
        SettingsUpdate(geofence_enabled=False, lms_training_gate_enabled=False),
    )

    template_id, field_id, task = _create_template_and_task(db)
    db.add(
        FormField(
            form_template_id=template_id,
            label="Nama pelaksana / PIC",
            field_type="responsible_person",
            is_required=True,
            sort_order=99,
            options_json={"system": True, "require_execution_note": False},
        )
    )
    db.commit()

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "form_template_id": template_id,
            "answers_json": {
                "operator": {"name": "Crew Pilot", "position": "Crew"},
                "note": "",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 200, response.text


def test_crew_push_test_endpoint_exists(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/api/v1/notifications/push/test",
        headers=auth_headers,
    )

    assert response.status_code in {200, 403, 503}, response.text
    if response.status_code == 200:
        payload = response.json()
        assert payload.get("message")
    elif response.status_code == 503:
        assert "VAPID" in response.json()["detail"]


def test_crew_push_test_requires_auth(client: TestClient):
    response = client.post("/api/v1/notifications/push/test")
    assert response.status_code == 401
