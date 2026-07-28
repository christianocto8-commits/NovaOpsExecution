from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class OpsSuiteItem(BaseModel):
    id: str
    module: str
    title: str
    outlet_id: str | None = None
    status: str = "open"
    quantity: float | None = None
    unit: str | None = None
    cost_per_unit: float | None = None
    actual_cost: float | None = None
    supplier: str | None = None
    forecast_quantity: float | None = None
    labor_hours: float | None = None
    attendance_count: int | None = None
    compliance_rule: str | None = None
    due_at: datetime | None = None
    metadata_json: dict | None = None


class OpsSuiteItemUpsert(BaseModel):
    module: str
    title: str
    outlet_id: str | None = None
    status: str = "open"
    quantity: float | None = None
    unit: str | None = None
    cost_per_unit: float | None = None
    actual_cost: float | None = None
    supplier: str | None = None
    forecast_quantity: float | None = None
    labor_hours: float | None = None
    attendance_count: int | None = None
    compliance_rule: str | None = None
    due_at: datetime | None = None
    metadata_json: dict | None = None


class OpsSuiteSummary(BaseModel):
    inventory_items: int
    labor_items: int
    food_label_items: int
    procurement_items: int
    onboarding_items: int
    customer_success_items: int
    benchmark_items: int
    integration_items: int
    open_items: int
    inventory_cost: float
    forecast_variance: float
    labor_hours: float
    open_procurement_items: int
