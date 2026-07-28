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


class IotSensorHealthRead(BaseModel):
    outlet_id: UUID
    sensor_type: str
    latest_value: float | None = None
    unit: str | None = None
    last_seen_at: datetime | None = None
    minutes_since_seen: int | None = None
    status: str
    within_threshold: bool | None = None
    threshold_min: float | None = None
    threshold_max: float | None = None
    calibration_due_at: datetime | None = None
    gateway_id: str | None = None
    gateway_status: str | None = None
    battery_level: float | None = None
    message: str
