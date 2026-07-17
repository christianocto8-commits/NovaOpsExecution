from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.form_field import FormFieldCreate, FormFieldResponse


class FormTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    form_type: str
    outlet_id: Optional[int] = None
    created_by: Optional[int] = None
    is_active: bool = True
    fields: list[FormFieldCreate] = Field(default_factory=list)


class FormTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    form_type: Optional[str] = None
    outlet_id: Optional[int] = None
    is_active: Optional[bool] = None
    fields: Optional[list[FormFieldCreate]] = None


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