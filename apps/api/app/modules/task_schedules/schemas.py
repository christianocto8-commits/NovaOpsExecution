from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


TaskScheduleRecurrence = Literal["daily", "weekly"]
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
    due_time: str = "09:00"
    weekly_publish_day: TaskWeeklyPublishDay | None = None
    auto_publish: bool = True

    @field_validator("form_template_id", mode="before")
    @classmethod
    def normalize_form_template_id(cls, value: object) -> int | None:
        if value in (None, "", 0):
            return None
        return value  # type: ignore[return-value]


class TaskScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    form_template_id: int | None = None
    priority: str | None = None
    recurrence: TaskScheduleRecurrence | None = None
    shifts: list[TaskScheduleShift] | None = None
    outlet_ids: list[str] | None = None
    due_time: str | None = None
    weekly_publish_day: TaskWeeklyPublishDay | None = None
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
    due_time: str
    weekly_publish_day: str | None
    auto_publish: bool
    is_active: bool
    created_by: int
    last_published_at: datetime | None
    next_publish_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskScheduleProcessResult(BaseModel):
    schedules_checked: int
    schedules_published: int
    tasks_created: int
    skipped_duplicates: int
