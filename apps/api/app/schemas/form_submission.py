from datetime import datetime
from typing import Any, Optional
from typing import Literal

from pydantic import BaseModel, Field


class FormAnswerCreate(BaseModel):
    form_field_id: int
    answer_text: Optional[str] = None
    answer_number: Optional[float] = None
    answer_boolean: Optional[bool] = None
    answer_json: Optional[Any] = None
    note: Optional[str] = None
    evidence_url: Optional[str] = None
    is_issue: bool = False


class FormAnswerResponse(BaseModel):
    id: int
    form_field_id: int
    answer_text: Optional[str]
    answer_number: Optional[float]
    answer_boolean: Optional[bool]
    answer_json: Optional[Any]
    note: Optional[str]
    evidence_url: Optional[str]
    is_issue: bool

    class Config:
        from_attributes = True


class FormSubmissionCreate(BaseModel):
    form_template_id: int
    outlet_id: int
    submitted_by: Optional[int] = None
    status: str = "submitted"
    score: Optional[float] = None
    responsible_person_name: Optional[str] = None
    answers: list[FormAnswerCreate] = Field(default_factory=list)


class FormSubmissionResponse(BaseModel):
    id: int
    form_template_id: int
    outlet_id: int
    submitted_by: int
    reviewed_by: Optional[int]
    status: str
    score: Optional[float]
    responsible_person_name: Optional[str]
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    answers: list[FormAnswerResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class FormSubmissionReviewUpdate(BaseModel):
    review: Literal["approved", "rejected"]
    note: Optional[str] = None
