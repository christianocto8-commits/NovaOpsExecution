from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


TaskDraftPriority = Literal["low", "medium", "high", "urgent"]


class TaskDraftCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: str | None = None
    assigned_to: int | None = None
    priority: TaskDraftPriority = "medium"
    due_date: datetime | None = None
    source_type: str | None = None
    source_id: int | None = None


class TaskDraftUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    assigned_to: int | None = None
    priority: TaskDraftPriority | None = None
    due_date: datetime | None = None
    source_type: str | None = None
    source_id: int | None = None


class TaskDraftResponse(BaseModel):
    id: int
    title: str
    description: str | None
    outlet_id: int
    created_by: int
    assigned_to: int | None
    priority: str
    due_date: datetime | None
    source_type: str | None
    source_id: int | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class TaskDraftPublishResponse(BaseModel):
    draft_id: int
    task_id: int
    message: str