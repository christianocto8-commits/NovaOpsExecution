from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.form_field import FormFieldCreate, FormFieldResponse


def _normalize_form_template_payload(data: Any) -> Any:
    if not isinstance(data, dict):
        return data

    payload = dict(data)

    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        name = payload.get("name")
        payload["title"] = name.strip() if isinstance(name, str) and name.strip() else "Untitled Form"
    else:
        payload["title"] = title.strip()

    form_type = payload.get("form_type")
    if not isinstance(form_type, str) or not form_type.strip():
        status = str(payload.get("status") or "").strip().lower()
        category = payload.get("category")
        if status == "draft":
            payload["form_type"] = "draft"
        elif isinstance(category, str) and category.strip():
            payload["form_type"] = category.strip()
        else:
            payload["form_type"] = "Checklist"
    else:
        payload["form_type"] = form_type.strip()

    if "is_active" not in payload and payload.get("status") is not None:
        payload["is_active"] = str(payload.get("status")).strip().lower() == "active"

    fields = payload.get("fields")
    if isinstance(fields, list):
        normalized_fields: list[dict[str, Any]] = []
        for index, field in enumerate(fields):
            if not isinstance(field, dict):
                continue

            label = field.get("label")
            if not isinstance(label, str) or not label.strip():
                fallback_name = field.get("name")
                label = fallback_name.strip() if isinstance(fallback_name, str) else ""
            label = label.strip()
            if not label:
                continue

            field_type = field.get("field_type") or field.get("type") or "text"
            help_text = field.get("help_text")
            if help_text is None:
                help_text = field.get("section")

            normalized_fields.append(
                {
                    "label": label,
                    "field_type": str(field_type),
                    "placeholder": field.get("placeholder"),
                    "help_text": help_text,
                    "is_required": bool(
                        field.get("is_required", field.get("required", False))
                    ),
                    "options_json": field.get("options_json", field.get("options")),
                    "validation_json": field.get("validation_json"),
                    "sort_order": int(field.get("sort_order", index)),
                }
            )
        payload["fields"] = normalized_fields

    return payload


class FormTemplateCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    form_type: str = Field(min_length=1, max_length=50)
    outlet_id: Optional[int] = None
    created_by: Optional[int] = None
    is_active: bool = True
    fields: list[FormFieldCreate] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        return _normalize_form_template_payload(data)


class FormTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    form_type: Optional[str] = None
    outlet_id: Optional[int] = None
    is_active: Optional[bool] = None
    fields: Optional[list[FormFieldCreate]] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        return _normalize_form_template_payload(data)


class FormTemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    form_type: str
    outlet_id: Optional[int]
    created_by: int
    is_active: bool
    fields: list[FormFieldResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class FormTemplateVersionResponse(BaseModel):
    id: int
    form_template_id: int
    version_number: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True