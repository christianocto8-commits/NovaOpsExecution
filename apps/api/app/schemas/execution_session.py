from typing import Any, Optional

from pydantic import BaseModel


class ExecutionSessionCreate(BaseModel):
    runtime_template_id: int
    status: str = "completed"
    answers_json: dict[str, Any]
    submitted_by: Optional[int] = None


class ExecutionSessionResponse(BaseModel):
    id: int
    runtime_template_id: int
    status: str
    answers_json: dict[str, Any]
    submitted_by: Optional[int]

    class Config:
        from_attributes = True