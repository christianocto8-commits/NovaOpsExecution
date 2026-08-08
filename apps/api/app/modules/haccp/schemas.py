from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

HACCP_CCPS = {
    "receiving",
    "cold_storage",
    "thawing",
    "cooking",
    "hot_holding",
    "cooling",
    "reheating",
    "cold_holding",
    "other",
}

HACCP_DEFAULT_RANGES = {
    "receiving": {"target_max": 8.0},
    "cold_storage": {"target_max": 4.0},
    "cold_holding": {"target_max": 4.0},
    "cooking": {"target_min": 74.0},
    "reheating": {"target_min": 74.0},
    "hot_holding": {"target_min": 60.0},
}


class HaccpLogCreate(BaseModel):
    outlet_id: UUID
    ccp_name: str = Field(min_length=1, max_length=120)
    item_name: str | None = Field(default=None, max_length=180)
    reading_value: float
    unit: str = Field(default="C", min_length=1, max_length=20)
    target_min: float | None = None
    target_max: float | None = None
    corrective_action: str | None = Field(default=None, max_length=2000)
    verification_notes: str | None = Field(default=None, max_length=2000)
    source: str = Field(default="manual", max_length=30)
    sensor_reading_id: UUID | None = None
    recorded_at: datetime | None = None

    @classmethod
    def with_defaults_for_ccp(cls, values: dict) -> dict:
        ccp = (values.get("ccp_name") or "").strip().lower()
        ranges = HACCP_DEFAULT_RANGES.get(ccp, {})
        values.setdefault("target_min", ranges.get("target_min"))
        values.setdefault("target_max", ranges.get("target_max"))
        return values


class HaccpLogUpdate(BaseModel):
    item_name: str | None = Field(default=None, max_length=180)
    reading_value: float | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    target_min: float | None = None
    target_max: float | None = None
    corrective_action: str | None = Field(default=None, max_length=2000)
    verification_notes: str | None = Field(default=None, max_length=2000)


class HaccpLogRead(BaseModel):
    id: UUID
    outlet_id: UUID
    created_by: UUID | None = None
    ccp_name: str
    item_name: str | None = None
    reading_value: float
    unit: str
    target_min: float | None = None
    target_max: float | None = None
    passed: bool
    corrective_action: str | None = None
    verification_notes: str | None = None
    source: str
    sensor_reading_id: UUID | None = None
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HaccpLogSummary(BaseModel):
    total: int
    passed: int
    failed: int
    critical_failures: int
    by_ccp: dict[str, dict[str, int]] = {}
