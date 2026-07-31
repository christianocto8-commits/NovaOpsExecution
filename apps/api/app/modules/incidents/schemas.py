from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


INCIDENT_STATUSES = {"reported", "triaged", "investigating", "resolved", "closed"}
INCIDENT_SEVERITIES = {"low", "medium", "high", "critical"}
FOLLOW_UP_STATUSES = {"open", "in_progress", "completed", "cancelled"}


class IncidentCreate(BaseModel):
    outlet_id: UUID
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=2, max_length=5000)
    category: str = Field(default="operational", min_length=2, max_length=60)
    severity: str = "medium"
    occurred_at: datetime
    due_at: datetime | None = None
    evidence_urls: list[str] = Field(default_factory=list, max_length=20)
    source_type: str | None = Field(default=None, max_length=50)
    source_id: str | None = Field(default=None, max_length=80)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in INCIDENT_SEVERITIES:
            raise ValueError("Unsupported incident severity")
        return normalized


class IncidentUpdate(BaseModel):
    owner_id: UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, min_length=2, max_length=5000)
    category: str | None = Field(default=None, min_length=2, max_length=60)
    severity: str | None = None
    status: str | None = None
    due_at: datetime | None = None
    root_cause: str | None = Field(default=None, max_length=5000)
    resolution: str | None = Field(default=None, max_length=5000)
    evidence_urls: list[str] | None = Field(default=None, max_length=20)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in INCIDENT_SEVERITIES:
            raise ValueError("Unsupported incident severity")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in INCIDENT_STATUSES:
            raise ValueError("Unsupported incident status")
        return normalized


class FollowUpCreate(BaseModel):
    incident_id: UUID | None = None
    outlet_id: UUID
    assignee_id: UUID | None = None
    title: str = Field(min_length=2, max_length=180)
    instructions: str | None = Field(default=None, max_length=5000)
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    due_at: datetime | None = None
    source_type: str | None = Field(default=None, max_length=50)
    source_id: str | None = Field(default=None, max_length=80)


class FollowUpUpdate(BaseModel):
    assignee_id: UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=180)
    instructions: str | None = Field(default=None, max_length=5000)
    status: str | None = None
    priority: str | None = Field(default=None, pattern="^(low|medium|high|critical)$")
    due_at: datetime | None = None
    completion_note: str | None = Field(default=None, max_length=5000)
    evidence_urls: list[str] | None = Field(default=None, max_length=20)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in FOLLOW_UP_STATUSES:
            raise ValueError("Unsupported follow-up status")
        return normalized


class FollowUpRead(BaseModel):
    id: UUID
    incident_id: UUID | None
    outlet_id: UUID
    created_by: UUID
    assignee_id: UUID | None
    title: str
    instructions: str | None
    status: str
    priority: str
    due_at: datetime | None
    completed_at: datetime | None
    completion_note: str | None
    evidence_urls: list[str]
    source_type: str | None
    source_id: str | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class IncidentRead(BaseModel):
    id: UUID
    outlet_id: UUID
    reporter_id: UUID
    owner_id: UUID | None
    title: str
    description: str
    category: str
    severity: str
    status: str
    occurred_at: datetime
    due_at: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None
    root_cause: str | None
    resolution: str | None
    evidence_urls: list[str]
    source_type: str | None
    source_id: str | None
    created_at: datetime | None
    updated_at: datetime | None
    follow_ups: list[FollowUpRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class IncidentSummary(BaseModel):
    total: int
    open: int
    critical_open: int
    overdue: int
    resolved: int
