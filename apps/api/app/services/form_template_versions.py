from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.form_template_version import FormTemplateVersion


def _serialize_field(field: FormField) -> dict[str, Any]:
    return {
        "label": field.label,
        "field_type": field.field_type,
        "placeholder": field.placeholder,
        "help_text": field.help_text,
        "is_required": field.is_required,
        "options_json": field.options_json,
        "validation_json": field.validation_json,
        "sort_order": field.sort_order,
    }


def build_template_snapshot(form_template: FormTemplate) -> dict[str, Any]:
    fields = sorted(form_template.fields or [], key=lambda item: item.sort_order)
    return {
        "title": form_template.title,
        "description": form_template.description,
        "form_type": form_template.form_type,
        "is_active": form_template.is_active,
        "outlet_id": form_template.outlet_id,
        "fields": [_serialize_field(field) for field in fields],
    }


def _next_version_number(db: Session, form_template_id: int) -> int:
    current_max = (
        db.query(func.max(FormTemplateVersion.version_number))
        .filter(FormTemplateVersion.form_template_id == form_template_id)
        .scalar()
    )
    return int(current_max or 0) + 1


def snapshot_form_template(
    db: Session,
    form_template: FormTemplate,
    *,
    created_by: int,
) -> FormTemplateVersion:
    version = FormTemplateVersion(
        form_template_id=form_template.id,
        version_number=_next_version_number(db, form_template.id),
        snapshot_json=build_template_snapshot(form_template),
        created_by=created_by,
    )
    db.add(version)
    db.flush()
    return version


def list_form_template_versions(
    db: Session,
    form_template_id: int,
) -> list[FormTemplateVersion]:
    return (
        db.query(FormTemplateVersion)
        .filter(FormTemplateVersion.form_template_id == form_template_id)
        .order_by(FormTemplateVersion.version_number.desc())
        .all()
    )


def restore_form_template_version(
    db: Session,
    form_template: FormTemplate,
    version: FormTemplateVersion,
    *,
    created_by: int,
) -> FormTemplate:
    snapshot_form_template(db, form_template, created_by=created_by)

    snapshot = version.snapshot_json or {}
    form_template.title = snapshot.get("title", form_template.title)
    form_template.description = snapshot.get("description")
    form_template.form_type = snapshot.get("form_type", form_template.form_type)
    form_template.is_active = bool(snapshot.get("is_active", form_template.is_active))
    form_template.outlet_id = snapshot.get("outlet_id")

    db.query(FormField).filter(FormField.form_template_id == form_template.id).delete()

    for index, field_data in enumerate(snapshot.get("fields") or []):
        if not isinstance(field_data, dict):
            continue

        db.add(
            FormField(
                form_template_id=form_template.id,
                label=field_data.get("label") or "Untitled field",
                field_type=field_data.get("field_type") or "text",
                placeholder=field_data.get("placeholder"),
                help_text=field_data.get("help_text"),
                is_required=bool(field_data.get("is_required", False)),
                options_json=field_data.get("options_json"),
                validation_json=field_data.get("validation_json"),
                sort_order=int(field_data.get("sort_order", index)),
            )
        )

    db.flush()
    return form_template
