from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ActivityAction = Literal[
    "task_completed",
    "checklist_submitted",
    "checklist_failed",
    "capa_created",
    "capa_resolved",
    "form_submitted",
    "announcement_published",
    "task_overdue",
]


class ActivityFeedItem(BaseModel):
    id: str
    action: ActivityAction
    summary: str
    actor_name: str
    actor_id: int | None = None
    outlet_id: int | None = None
    outlet_name: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    occurred_at: datetime
    detail_url: str | None = None
    metadata: dict = Field(default_factory=dict)


class ActivityFeedPage(BaseModel):
    total: int
    items: list[ActivityFeedItem]
