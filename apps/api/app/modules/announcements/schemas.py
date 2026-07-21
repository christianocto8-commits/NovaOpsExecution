from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


AnnouncementPriority = Literal["normal", "high", "urgent"]
AnnouncementTargetScope = Literal["all", "region", "district", "outlet"]


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    priority: AnnouncementPriority = "normal"
    target_scope: AnnouncementTargetScope = "all"
    target_ids: list[str] = Field(default_factory=list)
    requires_acknowledgment: bool = False
    expires_at: datetime | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1)
    priority: AnnouncementPriority | None = None
    target_scope: AnnouncementTargetScope | None = None
    target_ids: list[str] | None = None
    requires_acknowledgment: bool | None = None
    expires_at: datetime | None = None


class AnnouncementRead(BaseModel):
    id: UUID
    title: str
    body: str
    priority: AnnouncementPriority
    target_scope: AnnouncementTargetScope
    target_ids: list[str]
    requires_acknowledgment: bool
    published_at: datetime | None
    expires_at: datetime | None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
    is_read: bool = False
    is_acknowledged: bool = False
    read_at: datetime | None = None
    acknowledged_at: datetime | None = None

    model_config = {"from_attributes": True}


class AnnouncementAcknowledgeResponse(BaseModel):
    message: str
    announcement_id: UUID
    read_at: datetime | None = None
    acknowledged_at: datetime | None = None


class UnreadCountResponse(BaseModel):
    unread_count: int
