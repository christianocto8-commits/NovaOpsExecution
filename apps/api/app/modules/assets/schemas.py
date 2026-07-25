from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EquipmentHealthRead(BaseModel):
    id: str
    name: str
    outlet_id: UUID
    category: str
    status: str
    latest_value: float | None = None
    unit: str | None = None
    last_seen_at: datetime | None = None
    calibration_due_at: datetime | None = None
    gateway_id: str | None = None
    message: str
