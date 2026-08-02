from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


TaskScheduleRecurrence = Literal["once", "daily", "weekly", "monthly"]
TaskScheduleShift = Literal["morning", "evening", "midnight"]
TaskWeeklyPublishDay = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


class TaskScheduleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: str | None = None
    form_template_id: int | None = None
    priority: str = "medium"
    recurrence: TaskScheduleRecurrence
    shifts: list[TaskScheduleShift] = Field(default_factory=list)
    outlet_ids: list[str] = Field(min_length=1)
    publish_time: str = "09:00"
    due_time: str = "17:00"
    publish_at: datetime | None = None
    one_time_due_at: datetime | None = None
    weekly_publish_day: TaskWeeklyPublishDay | None = None
    monthly_publish_day: int | None = Field(default=None, ge=1, le=28)
    assigned_to: int | None = None
    auto_publish: bool = True

    @field_validator("form_template_id", mode="before")
    @classmethod
    def normalize_form_template_id(cls, value: object) -> int | None:
        if value in (None, "", 0):
            return None
        return value  # type: ignore[return-value]

    @model_validator(mode="after")
    def require_form_template(self) -> "TaskScheduleCreate":
        if self.form_template_id is None:
            raise ValueError("form_template_id is required for task schedules")
        return self


class TaskScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    form_template_id: int | None = None
    priority: str | None = None
    recurrence: TaskScheduleRecurrence | None = None
    shifts: list[TaskScheduleShift] | None = None
    outlet_ids: list[str] | None = None
    publish_time: str | None = None
    due_time: str | None = None
    publish_at: datetime | None = None
    one_time_due_at: datetime | None = None
    weekly_publish_day: TaskWeeklyPublishDay | None = None
    monthly_publish_day: int | None = Field(default=None, ge=1, le=28)
    assigned_to: int | None = None
    auto_publish: bool | None = None
    is_active: bool | None = None


class TaskScheduleResponse(BaseModel):
    id: int
    title: str
    description: str | None
    form_template_id: int | None
    priority: str
    recurrence: str
    shifts_json: list[str]
    outlet_ids_json: list[str]
    publish_time: str
    due_time: str
    weekly_publish_day: str | None
    monthly_publish_day: int | None
    assigned_to: int | None
    auto_publish: bool
    is_active: bool
    created_by: int
    last_published_at: datetime | None
    next_publish_at: datetime | None
    one_time_due_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskScheduleUpcomingResponse(BaseModel):
    id: str
    schedule_id: int
    title: str
    description: str | None
    form_template_id: int | None
    priority: str
    recurrence: str
    shift: str | None
    outlet_id: int
    outlet_ref: str
    publish_at: datetime
    locked: bool = True


class TaskScheduleExceptionCreate(BaseModel):
    date: date
    reason: str = Field(min_length=2, max_length=255)
    outlet_id: int | None = None


class TaskScheduleExceptionResponse(BaseModel):
    id: int
    date: date
    reason: str
    outlet_id: int | None
    created_by: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskScheduleProcessResult(BaseModel):
    schedules_checked: int
    schedules_published: int
    tasks_created: int
    skipped_duplicates: int
    upcoming_notifications_sent: int = 0
    skipped_exceptions: int = 0
