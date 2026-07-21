from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


API_KEY_SCOPES = [
    "read:health",
    "read:form-templates",
    "read:reports",
]


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str] = Field(default_factory=lambda: ["read:health", "read:form-templates"])


class ApiKeyRead(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyRead):
    raw_key: str
