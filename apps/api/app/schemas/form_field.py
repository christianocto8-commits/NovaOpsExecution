from typing import Any, Optional

from pydantic import BaseModel, Field


class FormFieldCreate(BaseModel):
    label: str = Field(min_length=1, max_length=150)
    field_type: str = Field(min_length=1, max_length=50)
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    is_required: bool = False
    options_json: Optional[Any] = None
    validation_json: Optional[Any] = None
    sort_order: int = 0


class FormFieldResponse(BaseModel):
    id: int
    form_template_id: int
    label: str
    field_type: str
    placeholder: Optional[str]
    help_text: Optional[str]
    is_required: bool
    options_json: Optional[Any]
    validation_json: Optional[Any]
    sort_order: int

    class Config:
        from_attributes = True
