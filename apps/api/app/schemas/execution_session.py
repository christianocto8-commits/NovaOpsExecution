from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class ExecutionSessionCreate(BaseModel):
    runtime_template_id: Optional[int] = None
    task_id: Optional[int] = None
    form_template_id: Optional[int] = None
    source_type: Optional[str] = Field(default=None, max_length=50)
    status: str = "completed"
    answers_json: dict[str, Any]
    submitted_by: Optional[int] = None

    @model_validator(mode="after")
    def validate_execution_source(self):
        if not self.runtime_template_id and not self.task_id and not self.form_template_id:
            raise ValueError("Execution session requires runtime_template_id, task_id, or form_template_id")

        return self


class ExecutionSessionUpdate(BaseModel):
    runtime_template_id: Optional[int] = None
    task_id: Optional[int] = None
    form_template_id: Optional[int] = None
    source_type: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = None
    answers_json: Optional[dict[str, Any]] = None
    submitted_by: Optional[int] = None


class ExecutionSessionResponse(BaseModel):
    id: int
    runtime_template_id: Optional[int]
    task_id: Optional[int]
    form_template_id: Optional[int]
    source_type: Optional[str]
    status: str
    answers_json: dict[str, Any]
    submitted_by: Optional[int]
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True
