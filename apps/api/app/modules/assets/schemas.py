from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EquipmentHealthRead(BaseModel):
    id: str
    name: str
    outlet_id: str
    category: str
    status: str
    latest_value: float | None = None
    unit: str | None = None
    last_seen_at: datetime | None = None
    calibration_due_at: datetime | None = None
    gateway_id: str | None = None
    message: str


class EquipmentRegisterItem(BaseModel):
    id: str
    name: str
    outlet_id: str | None = None
    category: str
    serial_number: str | None = None
    vendor: str | None = None
    location: str | None = None
    status: str = "active"
    qr_code: str | None = None
    maintenance_due_at: datetime | None = None
    calibration_due_at: datetime | None = None
    notes: str | None = None


class EquipmentRegisterUpsert(BaseModel):
    name: str
    outlet_id: str | None = None
    category: str = "equipment"
    serial_number: str | None = None
    vendor: str | None = None
    location: str | None = None
    status: str = "active"
    qr_code: str | None = None
    maintenance_due_at: datetime | None = None
    calibration_due_at: datetime | None = None
    notes: str | None = None


class TemperatureLogRead(BaseModel):
    id: str
    outlet_id: str
    value: float
    unit: str | None = None
    recorded_at: datetime
    status: str
    threshold_min: float
    threshold_max: float
    gateway_id: str | None = None
    calibration_due_at: datetime | None = None
