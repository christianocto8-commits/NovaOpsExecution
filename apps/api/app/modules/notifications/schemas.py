from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.notifications.models import NotificationChannel, NotificationStatus


class NotificationTemplateCreate(BaseModel):
    code: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=255)
    channel: NotificationChannel
    subject_template: str | None = Field(default=None, max_length=255)
    body_template: str = Field(min_length=1)
    is_active: bool = True
    metadata_json: dict | None = None


class NotificationTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    channel: NotificationChannel | None = None
    subject_template: str | None = Field(default=None, max_length=255)
    body_template: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None
    metadata_json: dict | None = None


class NotificationTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    channel: NotificationChannel
    subject_template: str | None = None
    body_template: str
    is_active: bool
    metadata_json: dict | None = None
    created_at: datetime
    updated_at: datetime


class NotificationEventCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=120)
    source_module: str = Field(min_length=2, max_length=120)
    source_entity_type: str | None = Field(default=None, max_length=120)
    source_entity_id: str | None = Field(default=None, max_length=120)
    template_code: str | None = Field(default=None, max_length=120)
    payload_json: dict | None = None
    recipient_user_id: UUID | None = None
    recipient_role_id: UUID | None = None
    channel: NotificationChannel = NotificationChannel.in_app
    subject: str | None = Field(default=None, max_length=255)
    body: str | None = None


class NotificationDeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    recipient_user_id: UUID | None = None
    recipient_role_id: UUID | None = None
    channel: NotificationChannel
    status: NotificationStatus
    subject: str | None = None
    body: str
    attempt_count: int
    last_error: str | None = None
    scheduled_at: datetime | None = None
    sent_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    action_url: str | None = None


class NotificationEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    source_module: str
    source_entity_type: str | None = None
    source_entity_id: str | None = None
    template_code: str | None = None
    payload_json: dict | None = None
    created_by_id: UUID | None = None
    created_at: datetime


class MessageResponse(BaseModel):
    message: str


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkNotificationsRead(BaseModel):
    delivery_ids: list[UUID] | None = None


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1)
    auth: str = Field(min_length=1)


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=1)
    keys: PushSubscriptionKeys
    outlet_id: UUID | None = None


class PushSubscriptionUnsubscribe(BaseModel):
    endpoint: str = Field(min_length=1)


class PushSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    endpoint: str
    outlet_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class PushTestResponse(BaseModel):
    message: str
    result: dict[str, int]


class DevicePushTokenRegister(BaseModel):
    token: str = Field(min_length=8, max_length=512)
    platform: str = Field(pattern="^(android|ios)$")
    outlet_id: UUID | None = None


class DevicePushTokenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    token: str
    platform: str
    outlet_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class NotificationPreferencesRead(BaseModel):
    email_enabled: bool = True
    push_enabled: bool = True
    digest_enabled: bool = False
    sms_enabled: bool = False


class NotificationPreferencesUpdate(BaseModel):
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    digest_enabled: bool | None = None
    sms_enabled: bool | None = None


class HistoryNotesRead(BaseModel):
    notes: dict[str, str] = Field(default_factory=dict)


class HistoryNotesUpdate(BaseModel):
    notes: dict[str, str] = Field(default_factory=dict)
