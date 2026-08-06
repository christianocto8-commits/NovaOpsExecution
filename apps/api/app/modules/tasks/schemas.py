from datetime import datetime
from typing import Any, Literal

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
    source_type: str | None = None
    source_id: int | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskReviewUpdate(BaseModel):
    review: Literal["approved", "rejected"]
    note: str | None = None


class CorrectiveActionEvidenceUpdate(BaseModel):
    root_cause: str | None = Field(default=None, max_length=120)
    before_evidence_url: str | None = None
    after_evidence_url: str | None = None
    note: str | None = None


class CorrectiveActionReject(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class TaskExecutionSubmit(BaseModel):
    form_template_id: int | None = None
    answers_json: dict[str, Any]
    latitude: float | None = None
    longitude: float | None = None
    accuracy_m: float | None = None


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
    outlet_name: str | None = None
    assigned_to: int | None
    created_by: int

    source_type: str | None
    source_id: int | None
    form_template_id: int | None = None
    form_template_name: str | None = None
    checklist_field_count: int = 0
    checklist_preview: list[str] = Field(default_factory=list)

    priority: str
    status: str

    due_date: datetime | None
    completed_at: datetime | None
    verified_at: datetime | None = None

    approved_by: int | None
    approved_at: datetime | None

    rejected_at: datetime | None = None
    review_note: str | None = None

    capa_root_cause: str | None = None
    capa_before_evidence_url: str | None = None
    capa_after_evidence_url: str | None = None
    capa_evidence_note: str | None = None

    schedule_id: int | None = None
    shift: str | None = None
    recurrence: str | None = None
    due_time: str | None = None
    weekly_publish_day: str | None = None
    auto_publish: bool | None = None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class TaskDetailResponse(TaskResponse):
    comments: list[TaskCommentResponse] = Field(default_factory=list)
    assignments: list[TaskAssignmentResponse] = Field(default_factory=list)


class TaskExecutionSubmitResponse(BaseModel):
    task: TaskResponse
    checklist: dict[str, Any] | None = None
    corrective_task: TaskResponse | None = None
