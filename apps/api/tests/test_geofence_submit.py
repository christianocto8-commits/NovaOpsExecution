import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.task import Task
from app.services.workspace_settings import update_workspace_settings
from app.schemas.settings import SettingsUpdate


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_template_and_task(db: Session, *, outlet_id: int = 1) -> tuple[int, int, Task]:
    template = FormTemplate(
        title="Geofence Test Template",
        description="Template for geofence validation tests",
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
        title="Geofence validation task",
        description="Task used for geofence tests",
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


def test_submit_execution_rejects_missing_gps_when_geofence_enabled(
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
            "answers_json": {
                "operator": {"name": "QA Operator", "position": "Crew"},
                "note": "Missing GPS",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 400
    assert "GPS location is required" in response.json()["detail"]


def test_submit_execution_accepts_within_geofence(
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
                "operator": {"name": "QA Operator", "position": "Crew"},
                "note": "Within geofence",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["task"]["id"] == task.id
    assert payload["checklist"] is not None


def test_submit_execution_rejects_outside_geofence(
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
                "operator": {"name": "QA Operator", "position": "Crew"},
                "note": "Outside geofence",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {str(field_id): "yes"},
            },
        },
    )

    assert response.status_code == 400
    assert "from the outlet" in response.json()["detail"]
