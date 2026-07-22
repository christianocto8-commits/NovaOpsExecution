from sqlalchemy.orm import Session

from app.models.form_field import FormField

DEFAULT_REQUIRE_EXECUTION_NOTE = True


def _is_responsible_person_field(field: FormField) -> bool:
    return field.field_type == "responsible_person"


def template_requires_execution_note(db: Session, form_template_id: int) -> bool:
    field = (
        db.query(FormField)
        .filter(
            FormField.form_template_id == form_template_id,
            FormField.field_type == "responsible_person",
        )
        .order_by(FormField.sort_order.asc())
        .first()
    )

    if not field or not isinstance(field.options_json, dict):
        return DEFAULT_REQUIRE_EXECUTION_NOTE

    require_note = field.options_json.get("require_execution_note")
    if require_note is None:
        return DEFAULT_REQUIRE_EXECUTION_NOTE

    return bool(require_note)
