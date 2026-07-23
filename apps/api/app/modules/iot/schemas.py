from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IotReadingIngest(BaseModel):
    outlet_id: UUID
    sensor_type: str = Field(min_length=1, max_length=80)
    value: float
    unit: str | None = Field(default=None, max_length=20)
    recorded_at: datetime | None = None
    metadata_json: dict | None = None


class IotReadingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    outlet_id: UUID
    sensor_type: str
    value: float
    unit: str | None = None
    recorded_at: datetime
    metadata_json: dict | None = None
    created_at: datetime


class IotEvaluateRequest(BaseModel):
    outlet_id: UUID | None = None
    sensor_type: str = "temperature"


class IotEvaluateResult(BaseModel):
    outlet_id: UUID
    sensor_type: str
    latest_value: float | None = None
    unit: str | None = None
    recorded_at: datetime | None = None
    within_threshold: bool
    threshold_min: float
    threshold_max: float
    flagged: bool
    message: str
