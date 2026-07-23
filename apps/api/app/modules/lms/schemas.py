from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TrainingModuleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    content_url: str | None = Field(default=None, max_length=500)
    duration_minutes: int = Field(default=15, ge=1, le=480)
    required_for_roles: list[str] = Field(default_factory=list)
    expires_days: int | None = Field(default=None, ge=1, le=3650)
    is_active: bool = True


class TrainingModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    content_url: str | None = Field(default=None, max_length=500)
    duration_minutes: int | None = Field(default=None, ge=1, le=480)
    required_for_roles: list[str] | None = None
    expires_days: int | None = Field(default=None, ge=1, le=3650)
    is_active: bool | None = None


class TrainingModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    content_url: str | None = None
    duration_minutes: int
    required_for_roles: list[str] | None = None
    expires_days: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TrainingCompletionCreate(BaseModel):
    module_id: UUID


class TrainingCompletionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    module_id: UUID
    completed_at: datetime
    expires_at: datetime | None = None
    created_at: datetime


class MyTrainingModuleRead(BaseModel):
    module: TrainingModuleRead
    completed: bool
    completed_at: datetime | None = None
    expires_at: datetime | None = None
    required: bool = True
