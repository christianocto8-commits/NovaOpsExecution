from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


WEBHOOK_EVENT_TYPES = (
    "task.created",
    "task.assigned",
    "task.completed",
    "checklist.failed",
    "task.overdue",
    "form.submitted",
    "schedule.published",
)


class WebhookCreate(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
    events: list[str] = Field(min_length=1)
    secret: str = Field(min_length=8, max_length=255)
    active: bool = True
    outlet_id: int | None = None
    description: str | None = None


class WebhookUpdate(BaseModel):
    url: str | None = Field(default=None, min_length=8, max_length=2048)
    events: list[str] | None = Field(default=None, min_length=1)
    secret: str | None = Field(default=None, min_length=8, max_length=255)
    active: bool | None = None
    outlet_id: int | None = None
    description: str | None = None


class WebhookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    events: list[str]
    active: bool
    outlet_id: int | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class WebhookReadWithSecret(WebhookRead):
    secret: str


class WebhookDeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subscription_id: UUID
    event_type: str
    url: str
    status: str
    attempt_count: int
    http_status: int | None = None
    error_message: str | None = None
    created_at: datetime
    delivered_at: datetime | None = None
