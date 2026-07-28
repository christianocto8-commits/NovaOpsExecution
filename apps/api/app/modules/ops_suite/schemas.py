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
    due_at: datetime | None = None
    metadata_json: dict | None = None


class OpsSuiteItemUpsert(BaseModel):
    module: str
    title: str
    outlet_id: str | None = None
    status: str = "open"
    quantity: float | None = None
    unit: str | None = None
    due_at: datetime | None = None
    metadata_json: dict | None = None


class OpsSuiteSummary(BaseModel):
    inventory_items: int
    labor_items: int
    food_label_items: int
    procurement_items: int
    open_items: int
