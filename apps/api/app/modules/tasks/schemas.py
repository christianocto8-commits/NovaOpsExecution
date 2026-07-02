from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


TaskPriority = Literal["low", "medium", "high", "urgent"]
TaskStatus = Literal[
    "open",
    "in_progress",
    "blocked",
    "completed",
    "cancelled",
]


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: str | None = None
    assigned_to: int | None = None
    priority: TaskPriority = "medium"
    due_date: datetime | None = None
    source_type: str | None = None
    source_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    description: str | None = None
    assigned_to: int | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskCommentCreate(BaseModel):
    comment: str = Field(min_length=1)
    evidence_url: str | None = None


# -----------------------------
# Assignment System
# -----------------------------

class TaskAssignmentCreate(BaseModel):
    user_id: int
    role: str = Field(default="assignee", max_length=50)


class OutletMemberResponse(BaseModel):
    id: int
    name: str
    email: str
    role_name: str | None = None

    model_config = {
        "from_attributes": True,
    }


class TaskAssignmentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    assigned_by: int | None = None
    role: str
    created_at: datetime

    user: OutletMemberResponse | None = None

    model_config = {
        "from_attributes": True,
    }


# -----------------------------
# Comments
# -----------------------------

class TaskCommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    comment: str
    evidence_url: str | None
    event_type: str
    previous_value: str | None
    new_value: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


# -----------------------------
# Task
# -----------------------------

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None

    outlet_id: int
    assigned_to: int | None
    created_by: int

    source_type: str | None
    source_id: int | None

    priority: str
    status: str

    due_date: datetime | None
    completed_at: datetime | None

    approved_by: int | None
    approved_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class TaskDetailResponse(TaskResponse):
    comments: list[TaskCommentResponse] = Field(default_factory=list)
    assignments: list[TaskAssignmentResponse] = Field(default_factory=list)