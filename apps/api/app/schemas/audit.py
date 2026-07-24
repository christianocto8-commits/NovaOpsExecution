from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AuditEventCategory = Literal[
    "task_comment",
    "form_submission",
    "execution_session",
    "security",
]


class AuditEventResponse(BaseModel):
    id: str
    category: AuditEventCategory
    action: str
    summary: str
    actor_name: str
    actor_id: int | str | None = None
    outlet_id: int | str | None = None
    outlet_name: str | None = None
    resource_type: str
    resource_id: str
    occurred_at: datetime
    metadata: dict = Field(default_factory=dict)


class AuditEventsPage(BaseModel):
    total: int
    items: list[AuditEventResponse]
