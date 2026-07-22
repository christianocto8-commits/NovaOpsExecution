from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.form_template_version import FormTemplateVersion


def _create_template(db: Session) -> FormTemplate:
    template = FormTemplate(
        title="Version Test Template",
        description="Initial description",
        form_type="Checklist",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()
    db.add(
        FormField(
            form_template_id=template.id,
            label="Field A",
            field_type="yes_no",
            is_required=True,
            sort_order=0,
        )
    )
    db.commit()
    db.refresh(template)
    return template


def test_form_template_patch_creates_version(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template = _create_template(db)

    response = client.patch(
        f"/api/v1/form-templates/{template.id}",
        headers=auth_headers,
        json={"title": "Version Test Template v2"},
    )
    assert response.status_code == 200, response.text

    versions = (
        db.query(FormTemplateVersion)
        .filter(FormTemplateVersion.form_template_id == template.id)
        .order_by(FormTemplateVersion.version_number.asc())
        .all()
    )
    assert len(versions) == 1
    assert versions[0].snapshot_json["title"] == "Version Test Template"


def test_form_template_versions_list_and_restore(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    template = _create_template(db)

    client.patch(
        f"/api/v1/form-templates/{template.id}",
        headers=auth_headers,
        json={"title": "Updated title"},
    )

    list_response = client.get(
        f"/api/v1/form-templates/{template.id}/versions",
        headers=auth_headers,
    )
    assert list_response.status_code == 200, list_response.text
    versions = list_response.json()
    assert len(versions) == 1
    version_id = versions[0]["id"]

    restore_response = client.post(
        f"/api/v1/form-templates/{template.id}/versions/{version_id}/restore",
        headers=auth_headers,
    )
    assert restore_response.status_code == 200, restore_response.text
    payload = restore_response.json()
    assert payload["title"] == "Version Test Template"
