import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.form_template import FormTemplate
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission
from app.models.form_answer import FormAnswer
from app.models.outlet import Outlet
from app.models.user import User


def test_form_template_create_and_update_with_field_reconciliation(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    suffix = uuid.uuid4().hex[:8]
    # 1. Create a template
    create_resp = client.post(
        "/api/v1/form-templates",
        headers=auth_headers,
        json={
            "title": f"Template Test {suffix}",
            "description": "Initial description",
            "form_type": "audit",
            "is_active": True,
            "fields": [
                {
                    "label": "Field 1",
                    "field_type": "yes_no",
                    "is_required": True,
                    "sort_order": 0,
                },
                {
                    "label": "Field 2",
                    "field_type": "text",
                    "is_required": False,
                    "sort_order": 1,
                },
            ],
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    created = create_resp.json()
    template_id = created["id"]
    fields = created["fields"]
    assert len(fields) == 2
    field1_id = fields[0]["id"]
    field2_id = fields[1]["id"]

    # 2. Simulate submission with answers linked to field1
    outlet = db.query(Outlet).first()
    user = db.query(User).first()
    if outlet and user:
        submission = FormSubmission(
            form_template_id=template_id,
            outlet_id=outlet.id,
            submitted_by=user.id,
        )
        db.add(submission)
        db.flush()

        answer = FormAnswer(
            form_submission_id=submission.id,
            form_field_id=field1_id,
            answer_boolean=True,
        )
        db.add(answer)
        db.commit()

    # 3. Update the template with field IDs preserved (simulating frontend Save Template)
    update_resp = client.patch(
        f"/api/v1/form-templates/{template_id}",
        headers=auth_headers,
        json={
            "title": f"Template Test Updated {suffix}",
            "description": "Updated description",
            "form_type": "audit",
            "is_active": True,
            "fields": [
                {
                    "id": field1_id,
                    "label": "Field 1 Renamed",
                    "field_type": "yes_no",
                    "is_required": True,
                    "sort_order": 0,
                },
                {
                    "label": "Brand New Field",
                    "field_type": "photo",
                    "is_required": False,
                    "sort_order": 1,
                },
            ],
        },
    )
    assert update_resp.status_code == 200, update_resp.text
    updated = update_resp.json()
    assert updated["title"] == f"Template Test Updated {suffix}"
    assert updated["fields"][0]["id"] == field1_id
    assert updated["fields"][0]["label"] == "Field 1 Renamed"

    # 4. Save as Draft
    draft_resp = client.patch(
        f"/api/v1/form-templates/{template_id}",
        headers=auth_headers,
        json={
            "form_type": "draft",
            "is_active": False,
            "fields": [
                {
                    "id": field1_id,
                    "label": "Field 1 Renamed",
                    "field_type": "yes_no",
                    "is_required": True,
                    "sort_order": 0,
                }
            ],
        },
    )
    assert draft_resp.status_code == 200, draft_resp.text
    draft_data = draft_resp.json()
    assert draft_data["form_type"] == "draft"
    assert draft_data["is_active"] is False
