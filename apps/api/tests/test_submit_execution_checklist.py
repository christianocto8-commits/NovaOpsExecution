import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.execution_session import ExecutionSession
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.task import Task


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_checklist_template(db: Session) -> tuple[int, list[FormField]]:
    template = FormTemplate(
        title="Submit Execution Scoring Template",
        description="Template for submit execution scoring tests",
        form_type="test",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    fields = [
        FormField(
            form_template_id=template.id,
            label="Equipment checked",
            field_type="yes_no",
            is_required=True,
            sort_order=0,
        ),
        FormField(
            form_template_id=template.id,
            label="Temperature log",
            field_type="number",
            is_required=True,
            sort_order=1,
            validation_json={"min": 0, "max": 8},
        ),
    ]
    db.add_all(fields)
    db.commit()
    for field in fields:
        db.refresh(field)
    return template.id, fields


def _create_task(db: Session, *, template_id: int, outlet_id: int = 1) -> Task:
    task = Task(
        title="Checklist scoring integration task",
        description="Task used for submit execution scoring tests",
        outlet_id=outlet_id,
        assigned_to=None,
        created_by=1,
        source_type="form_template",
        source_id=template_id,
        priority="medium",
        status="open",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_submit_execution_embeds_checklist_and_creates_corrective_action(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template_id, fields = _create_checklist_template(db)
    task = _create_task(db, template_id=template_id)

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "form_template_id": template_id,
            "answers_json": {
                "operator": {"name": "QA Operator", "position": "Crew"},
                "note": "Checklist failed on equipment check.",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {
                    str(fields[0].id): "no",
                    str(fields[1].id): "4",
                },
            },
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["task"]["id"] == task.id
    assert payload["checklist"] is not None
    assert payload["checklist"]["failed_count"] == 1
    assert payload["checklist"]["status"] == "fail"
    assert payload["checklist"]["failed_items"][0]["label"] == "Equipment checked"

    session = (
        db.query(ExecutionSession)
        .filter(ExecutionSession.task_id == task.id, ExecutionSession.status == "completed")
        .order_by(ExecutionSession.id.desc())
        .first()
    )
    assert session is not None
    checklist = session.answers_json.get("_checklist")
    assert checklist is not None
    assert checklist["failed_count"] == 1
    assert checklist["status"] == "fail"
    assert checklist["failed_items"][0]["label"] == "Equipment checked"

    corrective_tasks = (
        db.query(Task)
        .filter(Task.source_type == "corrective_action", Task.source_id == task.id)
        .all()
    )
    assert len(corrective_tasks) == 1
    assert corrective_tasks[0].title.startswith("Corrective:")
    assert "Equipment checked" in corrective_tasks[0].description

    list_response = client.get(
        "/api/v1/tasks?source_type=corrective_action",
        headers=auth_headers,
    )
    assert list_response.status_code == 200
    payload = list_response.json()
    assert any(item["id"] == corrective_tasks[0].id for item in payload)


def test_submit_execution_passing_checklist_does_not_create_corrective_action(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template_id, fields = _create_checklist_template(db)
    task = _create_task(db, template_id=template_id)

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
        json={
            "form_template_id": template_id,
            "answers_json": {
                "operator": {"name": "QA Operator", "position": "Crew"},
                "note": "All checklist items passed.",
                "evidence": '[{"id":"1","url":"/uploads/evidence/test.png"}]',
                "responses": {
                    str(fields[0].id): "yes",
                    str(fields[1].id): "4",
                },
            },
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["checklist"]["status"] == "pass"
    assert payload["checklist"]["failed_count"] == 0

    session = (
        db.query(Task)
        .filter(Task.source_type == "corrective_action", Task.source_id == task.id)
        .all()
    )
    assert corrective_tasks == []
