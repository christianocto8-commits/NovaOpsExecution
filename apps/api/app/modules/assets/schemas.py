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
    gateway_status: str | None = None
    battery_level: float | None = None
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
    lifecycle_status: str = "in_service"
    replacement_for_id: str | None = None
    gateway_id: str | None = None
    pairing_code: str | None = None
    gateway_provisioned_at: datetime | None = None
    battery_level: float | None = None
    battery_alert_threshold: float | None = 20
    sensor_enabled: bool = True
    calibration_status: str = "not_required"
    replacement_approval_status: str = "not_requested"
    replacement_requested_at: datetime | None = None
    replacement_approved_at: datetime | None = None
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
    lifecycle_status: str = "in_service"
    replacement_for_id: str | None = None
    gateway_id: str | None = None
    pairing_code: str | None = None
    gateway_provisioned_at: datetime | None = None
    battery_level: float | None = None
    battery_alert_threshold: float | None = 20
    sensor_enabled: bool = True
    calibration_status: str = "not_required"
    replacement_approval_status: str = "not_requested"
    replacement_requested_at: datetime | None = None
    replacement_approved_at: datetime | None = None
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
    gateway_status: str | None = None
    battery_level: float | None = None
    calibration_due_at: datetime | None = None
