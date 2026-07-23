"""Zenput parity — form categories, templates, and task execution API."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.form_template import FormTemplate

ZENPUT_CATEGORY_SLUGS = {
    "opening",
    "closing",
    "food_safety",
    "cleaning",
    "audit",
    "inventory",
    "maintenance",
    "quality_check",
    "corrective_action",
    "uncategorized",
}

BOOTSTRAP_TEMPLATE_TYPES = {"opening", "food_safety", "cleaning", "closing"}


def test_bootstrap_operational_templates_use_zenput_categories(db: Session):
    templates = db.query(FormTemplate).filter(FormTemplate.is_active.is_(True)).all()
    bootstrap = [template for template in templates if template.form_type in BOOTSTRAP_TEMPLATE_TYPES]

    assert bootstrap, "Expected bootstrap operational templates to exist"
    assert {template.form_type for template in bootstrap} >= BOOTSTRAP_TEMPLATE_TYPES


def test_form_template_create_accepts_zenput_category_slug(client: TestClient, auth_headers: dict[str, str]):
    suffix = uuid.uuid4().hex[:8]
    response = client.post(
        "/api/v1/form-templates",
        headers=auth_headers,
        json={
            "title": f"Zenput parity audit {suffix}",
            "description": "Category parity test",
            "form_type": "audit",
            "outlet_id": None,
            "is_active": True,
            "fields": [
                {
                    "label": "Line check completed",
                    "field_type": "yes_no",
                    "is_required": True,
                    "sort_order": 0,
                }
            ],
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["form_type"] == "audit"

    delete_response = client.delete(
        f"/api/v1/form-templates/{payload['id']}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 204


def test_form_template_default_category_is_uncategorized(client: TestClient, auth_headers: dict[str, str]):
    suffix = uuid.uuid4().hex[:8]
    response = client.post(
        "/api/v1/form-templates",
        headers=auth_headers,
        json={
            "title": f"Zenput parity default {suffix}",
            "description": "Default category test",
            "outlet_id": None,
            "is_active": True,
            "fields": [
                {
                    "label": "Check item",
                    "field_type": "yes_no",
                    "is_required": True,
                    "sort_order": 0,
                }
            ],
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["form_type"] == "uncategorized"

    client.delete(f"/api/v1/form-templates/{payload['id']}", headers=auth_headers)


@pytest.mark.parametrize("category_slug", sorted(ZENPUT_CATEGORY_SLUGS))
def test_all_zenput_category_slugs_persist(
    client: TestClient,
    auth_headers: dict[str, str],
    category_slug: str,
):
    suffix = uuid.uuid4().hex[:8]
    response = client.post(
        "/api/v1/form-templates",
        headers=auth_headers,
        json={
            "title": f"Zenput {category_slug} {suffix}",
            "description": "Category slug parity",
            "form_type": category_slug,
            "outlet_id": None,
            "is_active": True,
            "fields": [
                {
                    "label": "Sample field",
                    "field_type": "yes_no",
                    "is_required": False,
                    "sort_order": 0,
                }
            ],
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["form_type"] == category_slug

    client.delete(f"/api/v1/form-templates/{payload['id']}", headers=auth_headers)


def test_task_with_form_template_remains_linked(client: TestClient, auth_headers: dict[str, str], db: Session):
    from app.models.task import Task

    template = (
        db.query(FormTemplate)
        .filter(FormTemplate.form_type == "opening", FormTemplate.is_active.is_(True))
        .first()
    )
    if template is None:
        pytest.skip("No opening bootstrap template")

    outlet_id = 1
    task = Task(
        title="Zenput parity linked task",
        description="Task linked to opening template",
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

    list_response = client.get("/api/v1/tasks?limit=20", headers=auth_headers)
    assert list_response.status_code == 200
    tasks = list_response.json()
    matched = next((item for item in tasks if item["id"] == task.id), None)
    assert matched is not None
    assert matched.get("source_type") == "form_template"
    assert matched.get("form_template_id") == template.id
    assert matched.get("form_template_name") == template.title
    assert matched.get("checklist_field_count", 0) >= 1
    assert isinstance(matched.get("checklist_preview"), list)

    db.delete(task)
    db.commit()
