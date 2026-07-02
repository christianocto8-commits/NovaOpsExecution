from typing import Optional
from pydantic import BaseModel


class FormTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    form_type: str
    outlet_id: Optional[int] = None
    created_by: int


class FormTemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    form_type: str
    outlet_id: Optional[int]
    created_by: int
    is_active: bool

    class Config:
        from_attributes = True