import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.services.field_visibility import is_field_visible, validate_conditional_required_fields


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_conditional_template(db: Session) -> tuple[int, FormField, FormField]:
    template = FormTemplate(
        title="Conditional Test",
        description="Visibility rule tests",
        form_type="test",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    trigger = FormField(
        form_template_id=template.id,
        label="Inspection result",
        field_type="yes_no",
        is_required=True,
        sort_order=0,
    )
    photo = FormField(
        form_template_id=template.id,
        label="Failure photo",
        field_type="photo",
        is_required=True,
        sort_order=1,
        options_json={
            "visibilityRule": {
                "fieldId": "placeholder",
                "operator": "equals",
                "value": "No",
            }
        },
    )
    db.add(trigger)
    db.add(photo)
    db.flush()

    photo.options_json = {
        "visibilityRule": {
            "fieldId": str(trigger.id),
            "operator": "equals",
            "value": "No",
        }
    }
    db.commit()
    db.refresh(trigger)
    db.refresh(photo)
    return template.id, trigger, photo


def test_is_field_visible_legacy_and_operators(db: Session):
    _, trigger, photo = _create_conditional_template(db)

    assert is_field_visible(photo, {str(trigger.id): "Yes"}) is False
    assert is_field_visible(photo, {str(trigger.id): "No"}) is True

    photo.options_json = {
        "visibilityRule": {
            "fieldId": str(trigger.id),
            "operator": "contains",
            "value": "Fail",
        }
    }
    assert is_field_visible(photo, {str(trigger.id): "Minor Fail"}) is True


def test_validate_conditional_required_fields_rejects_missing_visible(db: Session):
    template_id, trigger, photo = _create_conditional_template(db)

    with pytest.raises(HTTPException) as exc_info:
        validate_conditional_required_fields(
            db,
            form_template_id=template_id,
            responses={str(trigger.id): "No"},
        )

    assert exc_info.value.status_code == 400
    assert photo.label in exc_info.value.detail["missing_fields"]


def test_validate_conditional_required_fields_ignores_hidden_required(db: Session):
    template_id, trigger, _photo = _create_conditional_template(db)

    validate_conditional_required_fields(
        db,
        form_template_id=template_id,
        responses={str(trigger.id): "Yes"},
    )
