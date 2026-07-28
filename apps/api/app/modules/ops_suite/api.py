from __future__ import annotations

import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User as IdentityUser
from app.modules.ops_suite.schemas import OpsSuiteItem, OpsSuiteItemUpsert, OpsSuiteSummary

router = APIRouter(prefix="/ops-suite", tags=["Ops Suite"])
OPS_SUITE_KEY = "ops_suite_items"
VALID_MODULES = {"inventory", "labor", "food_label", "procurement"}


def _load_items(db: Session) -> list[dict]:
    row = db.query(AppSettings).filter(AppSettings.key == OPS_SUITE_KEY).first()
    if not row:
        return []
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def _save_items(db: Session, items: list[dict]) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == OPS_SUITE_KEY).first()
    payload = json.dumps(items, default=str)
    if row:
        row.payload = payload
    else:
        row = AppSettings(key=OPS_SUITE_KEY, payload=payload)
    db.add(row)
    db.commit()


def _validate_module(module: str) -> str:
    normalized = module.strip().lower()
    if normalized not in VALID_MODULES:
        raise HTTPException(status_code=400, detail="Unsupported ops module")
    return normalized


@router.get("/items", response_model=list[OpsSuiteItem])
def list_ops_suite_items(
    module: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    items = [OpsSuiteItem(**item) for item in _load_items(db)]
    if module:
        normalized = _validate_module(module)
        items = [item for item in items if item.module == normalized]
    return items


@router.post("/items", response_model=OpsSuiteItem, status_code=status.HTTP_201_CREATED)
def create_ops_suite_item(
    payload: OpsSuiteItemUpsert,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_items(db)
    item = OpsSuiteItem(id=uuid4().hex, **payload.model_dump())
    item.module = _validate_module(item.module)
    items.append(item.model_dump(mode="json"))
    _save_items(db, items)
    return item


@router.patch("/items/{item_id}", response_model=OpsSuiteItem)
def update_ops_suite_item(
    item_id: str,
    payload: OpsSuiteItemUpsert,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_items(db)
    for index, item in enumerate(items):
        if item.get("id") == item_id:
            next_item = OpsSuiteItem(id=item_id, **payload.model_dump())
            next_item.module = _validate_module(next_item.module)
            items[index] = next_item.model_dump(mode="json")
            _save_items(db, items)
            return next_item
    raise HTTPException(status_code=404, detail="Ops suite item not found")


@router.get("/summary", response_model=OpsSuiteSummary)
def get_ops_suite_summary(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    items = [OpsSuiteItem(**item) for item in _load_items(db)]
    return OpsSuiteSummary(
        inventory_items=sum(1 for item in items if item.module == "inventory"),
        labor_items=sum(1 for item in items if item.module == "labor"),
        food_label_items=sum(1 for item in items if item.module == "food_label"),
        procurement_items=sum(1 for item in items if item.module == "procurement"),
        open_items=sum(1 for item in items if item.status != "closed"),
    )
