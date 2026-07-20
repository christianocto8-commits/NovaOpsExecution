import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.services.checklist_scoring import score_checklist


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_template_with_fields(db: Session) -> tuple[int, list[FormField]]:
    template = FormTemplate(
        title="Scoring Test Template",
        description="Template for checklist scoring tests",
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
            label="Store ready",
            field_type="yes_no",
            is_required=True,
            sort_order=0,
        ),
        FormField(
            form_template_id=template.id,
            label="Cooler temperature",
            field_type="number",
            is_required=True,
            sort_order=1,
            validation_json={"min": 0, "max": 5},
        ),
        FormField(
            form_template_id=template.id,
            label="Opening photo",
            field_type="photo",
            is_required=True,
            sort_order=2,
        ),
        FormField(
            form_template_id=template.id,
            label="Optional notes",
            field_type="textarea",
            is_required=False,
            sort_order=3,
        ),
    ]
    db.add_all(fields)
    db.commit()
    db.refresh(template)
    for field in fields:
        db.refresh(field)
    return template.id, fields


def test_score_checklist_passes_all_required_fields(db: Session):
    template_id, fields = _create_template_with_fields(db)

    result = score_checklist(
        db,
        form_template_id=template_id,
        answers_json={
            "responses": {
                str(fields[0].id): "yes",
                str(fields[1].id): "3",
                str(fields[2].id): "https://example.com/opening.jpg",
            }
        },
    )

    assert result["score"] == 100
    assert result["passed_count"] == 3
    assert result["failed_count"] == 0
    assert result["status"] == "pass"
    assert result["failed_items"] == []


def test_score_checklist_fails_yes_no_and_number(db: Session):
    template_id, fields = _create_template_with_fields(db)

    result = score_checklist(
        db,
        form_template_id=template_id,
        answers_json={
            "responses": {
                str(fields[0].id): "no",
                str(fields[1].id): "12",
                str(fields[2].id): "https://example.com/opening.jpg",
            }
        },
    )

    assert result["failed_count"] == 2
    assert result["score"] == 33
    assert result["status"] == "fail"
    assert len(result["failed_items"]) == 2
    assert result["failed_items"][0]["label"] == "Store ready"


def test_score_checklist_optional_empty_field_is_neutral(db: Session):
    template_id, fields = _create_template_with_fields(db)

    result = score_checklist(
        db,
        form_template_id=template_id,
        answers_json={
            "responses": {
                str(fields[0].id): "Ya",
                str(fields[1].id): "2",
                str(fields[2].id): "/uploads/evidence/opening.png",
            }
        },
    )

    assert result["total_scorable"] == 3
    assert result["passed_count"] == 3
    assert result["status"] == "pass"


def test_score_checklist_without_template_returns_pass(db: Session):
    result = score_checklist(
        db,
        form_template_id=None,
        answers_json={"responses": {}},
    )

    assert result == {
        "score": 100,
        "passed_count": 0,
        "failed_count": 0,
        "total_scorable": 0,
        "failed_items": [],
        "status": "pass",
    }
