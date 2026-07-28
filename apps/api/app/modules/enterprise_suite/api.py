from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.modules.enterprise_suite.schemas import (
    EnterpriseSuiteSummary,
    InventoryCountItem,
    InventoryCountUpsert,
    LaborAttendanceItem,
    LaborAttendanceUpsert,
    PurchaseRequestItem,
    PurchaseRequestUpsert,
    SupportItem,
    SupportUpsert,
)
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User as IdentityUser

router = APIRouter(prefix="/enterprise-suite", tags=["Enterprise Suite"])


STORE = {
    "inventory": ("enterprise_inventory_counts", InventoryCountItem, InventoryCountUpsert),
    "purchase": ("enterprise_purchase_requests", PurchaseRequestItem, PurchaseRequestUpsert),
    "labor": ("enterprise_labor_attendance", LaborAttendanceItem, LaborAttendanceUpsert),
    "support": ("enterprise_support_items", SupportItem, SupportUpsert),
}


def _load(db: Session, key: str) -> list[dict[str, Any]]:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if not row:
        return []
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def _save(db: Session, key: str, items: list[dict[str, Any]]) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    payload = json.dumps(items, default=str)
    if row:
        row.payload = payload
    else:
        row = AppSettings(key=key, payload=payload)
    db.add(row)
    db.commit()


def _store(kind: str):
    try:
        return STORE[kind]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Enterprise module not found") from exc


def _with_status_timestamps(payload: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    status_value = str(payload.get("status") or "").lower()
    if status_value == "approved" and not payload.get("approved_at"):
        payload["approved_at"] = now
    if status_value == "received" and not payload.get("received_at"):
        payload["received_at"] = now
    if status_value == "requested" and not payload.get("requested_at"):
        payload["requested_at"] = now
    return payload


@router.get("/{kind}/items")
def list_items(
    kind: str,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    key, model, _ = _store(kind)
    return [model(**item) for item in _load(db, key)]


@router.post("/{kind}/items", status_code=status.HTTP_201_CREATED)
def create_item(
    kind: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    key, model, upsert_model = _store(kind)
    data = _with_status_timestamps(upsert_model(**payload).model_dump())
    item = model(id=uuid4().hex, **data)
    items = _load(db, key)
    items.append(item.model_dump(mode="json"))
    _save(db, key, items)
    return item


@router.patch("/{kind}/items/{item_id}")
def update_item(
    kind: str,
    item_id: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    key, model, upsert_model = _store(kind)
    items = _load(db, key)
    for index, item in enumerate(items):
        if item.get("id") == item_id:
            data = _with_status_timestamps(upsert_model(**payload).model_dump())
            next_item = model(id=item_id, **data)
            items[index] = next_item.model_dump(mode="json")
            _save(db, key, items)
            return next_item
    raise HTTPException(status_code=404, detail="Enterprise item not found")


@router.get("/summary", response_model=EnterpriseSuiteSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    inventory = [InventoryCountItem(**item) for item in _load(db, STORE["inventory"][0])]
    purchase = [PurchaseRequestItem(**item) for item in _load(db, STORE["purchase"][0])]
    labor = [LaborAttendanceItem(**item) for item in _load(db, STORE["labor"][0])]
    support = [SupportItem(**item) for item in _load(db, STORE["support"][0])]

    shrink_value = sum(
        max(0, item.expected_quantity - item.actual_quantity) * item.unit_cost
        for item in inventory
    )
    waste_value = sum(
        max(0, item.actual_quantity - item.expected_quantity) * item.unit_cost
        for item in inventory
    )
    health_scores = [item.health_score for item in support if item.health_score is not None]

    return EnterpriseSuiteSummary(
        inventory_counts=len(inventory),
        shrink_value=round(shrink_value, 2),
        waste_value=round(waste_value, 2),
        open_purchase_requests=sum(1 for item in purchase if item.status not in {"received", "cancelled"}),
        approved_purchase_value=round(
            sum(item.estimated_cost for item in purchase if item.status in {"approved", "received"}),
            2,
        ),
        late_attendance=sum(1 for item in labor if item.status == "late"),
        missed_attendance=sum(1 for item in labor if item.status == "missed"),
        open_support_items=sum(1 for item in support if item.status != "closed"),
        average_health_score=round(sum(health_scores) / len(health_scores), 1) if health_scores else None,
    )
