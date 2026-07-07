from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationTemplateBase(BaseModel):
    workflow_id: UUID
    event: str = Field(..., min_length=1, max_length=80)
    channel: str = Field(default="in_app", min_length=1, max_length=40)
    title_template: str = Field(..., min_length=1, max_length=255)
    body_template: str = Field(..., min_length=1)
    enabled: bool = True


class NotificationTemplateCreate(NotificationTemplateBase):
    pass


class NotificationTemplateUpdate(BaseModel):
    event: str | None = Field(default=None, min_length=1, max_length=80)
    channel: str | None = Field(default=None, min_length=1, max_length=40)
    title_template: str | None = Field(default=None, min_length=1, max_length=255)
    body_template: str | None = Field(default=None, min_length=1)
    enabled: bool | None = None


class NotificationTemplateRead(NotificationTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
