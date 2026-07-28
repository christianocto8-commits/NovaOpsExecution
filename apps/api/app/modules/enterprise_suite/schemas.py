from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class InventoryCountItem(BaseModel):
    id: str
    outlet_id: str | None = None
    item_name: str
    unit: str = "unit"
    expected_quantity: float = 0
    actual_quantity: float = 0
    unit_cost: float = 0
    reason: str | None = None
    counted_at: datetime | None = None


class InventoryCountUpsert(BaseModel):
    outlet_id: str | None = None
    item_name: str
    unit: str = "unit"
    expected_quantity: float = 0
    actual_quantity: float = 0
    unit_cost: float = 0
    reason: str | None = None
    counted_at: datetime | None = None


class PurchaseRequestItem(BaseModel):
    id: str
    outlet_id: str | None = None
    supplier: str
    item_name: str
    quantity: float = 0
    unit: str = "unit"
    estimated_cost: float = 0
    status: str = "requested"
    requested_at: datetime | None = None
    approved_at: datetime | None = None
    received_at: datetime | None = None


class PurchaseRequestUpsert(BaseModel):
    outlet_id: str | None = None
    supplier: str
    item_name: str
    quantity: float = 0
    unit: str = "unit"
    estimated_cost: float = 0
    status: str = "requested"
    requested_at: datetime | None = None
    approved_at: datetime | None = None
    received_at: datetime | None = None


class LaborAttendanceItem(BaseModel):
    id: str
    outlet_id: str | None = None
    employee_name: str
    shift_start: datetime
    shift_end: datetime | None = None
    clock_in_at: datetime | None = None
    clock_out_at: datetime | None = None
    status: str = "scheduled"
    note: str | None = None


class LaborAttendanceUpsert(BaseModel):
    outlet_id: str | None = None
    employee_name: str
    shift_start: datetime
    shift_end: datetime | None = None
    clock_in_at: datetime | None = None
    clock_out_at: datetime | None = None
    status: str = "scheduled"
    note: str | None = None


class SupportItem(BaseModel):
    id: str
    category: str = "onboarding"
    title: str
    owner: str | None = None
    status: str = "open"
    priority: str = "medium"
    due_at: datetime | None = None
    health_score: float | None = None
    sla_hours: float | None = None
    note: str | None = None


class SupportUpsert(BaseModel):
    category: str = "onboarding"
    title: str
    owner: str | None = None
    status: str = "open"
    priority: str = "medium"
    due_at: datetime | None = None
    health_score: float | None = None
    sla_hours: float | None = None
    note: str | None = None


class EnterpriseSuiteSummary(BaseModel):
    inventory_counts: int
    shrink_value: float
    waste_value: float
    open_purchase_requests: int
    approved_purchase_value: float
    late_attendance: int
    missed_attendance: int
    open_support_items: int
    average_health_score: float | None
