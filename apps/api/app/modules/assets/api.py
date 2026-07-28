from __future__ import annotations

import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.modules.assets.schemas import (
    EquipmentHealthRead,
    EquipmentRegisterItem,
    EquipmentRegisterUpsert,
    TemperatureLogRead,
)
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User as IdentityUser
from app.modules.iot.models import IotSensorReading
from app.modules.iot.service import IotService
from app.services.workspace_settings import get_workspace_settings

router = APIRouter(prefix="/assets", tags=["Assets"])
ASSET_REGISTER_KEY = "asset_register"


def _load_register(db: Session) -> list[dict]:
    row = db.query(AppSettings).filter(AppSettings.key == ASSET_REGISTER_KEY).first()
    if not row:
        return []
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def _save_register(db: Session, items: list[dict]) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == ASSET_REGISTER_KEY).first()
    payload = json.dumps(items, default=str)
    if row:
        row.payload = payload
    else:
        row = AppSettings(key=ASSET_REGISTER_KEY, payload=payload)
    db.add(row)
    db.commit()


def _registered_asset_health(register_item: EquipmentRegisterItem) -> EquipmentHealthRead:
    status = "online" if register_item.status == "active" else register_item.status
    return EquipmentHealthRead(
        id=register_item.id,
        name=register_item.name,
        outlet_id=register_item.outlet_id or "00000000-0000-0000-0000-000000000000",
        category=register_item.category,
        status=status,
        calibration_due_at=register_item.calibration_due_at,
        message=register_item.notes or "Registered asset without live sensor telemetry.",
    )


@router.get("/equipment-health", response_model=list[EquipmentHealthRead])
def list_equipment_health(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user

    rows: list[EquipmentHealthRead] = []
    registered = [EquipmentRegisterItem(**item) for item in _load_register(db)]
    sensor_asset_ids: set[str] = set()
    for sensor in IotService(db).list_sensor_health():
        equipment_id = f"{sensor.outlet_id}:{sensor.sensor_type}"
        sensor_asset_ids.add(equipment_id)
        equipment_name = sensor.sensor_type.replace("_", " ").title()
        registered_match = next((item for item in registered if item.id == equipment_id), None)
        rows.append(
            EquipmentHealthRead(
                id=equipment_id,
                name=registered_match.name if registered_match else equipment_name,
                outlet_id=str(sensor.outlet_id),
                category=registered_match.category if registered_match else sensor.sensor_type,
                status=sensor.status,
                latest_value=sensor.latest_value,
                unit=sensor.unit,
                last_seen_at=sensor.last_seen_at,
                calibration_due_at=sensor.calibration_due_at,
                gateway_id=sensor.gateway_id,
                gateway_status=sensor.gateway_status,
                battery_level=sensor.battery_level,
                message=sensor.message,
            )
        )

    rows.extend(
        _registered_asset_health(item)
        for item in registered
        if item.id not in sensor_asset_ids
    )
    return rows


@router.get("/equipment", response_model=list[EquipmentRegisterItem])
def list_equipment_register(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    return [EquipmentRegisterItem(**item) for item in _load_register(db)]


@router.post("/equipment", response_model=EquipmentRegisterItem, status_code=status.HTTP_201_CREATED)
def create_equipment_register_item(
    payload: EquipmentRegisterUpsert,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_register(db)
    item = EquipmentRegisterItem(id=uuid4().hex, **payload.model_dump())
    items.append(item.model_dump(mode="json"))
    _save_register(db, items)
    return item


@router.patch("/equipment/{equipment_id}", response_model=EquipmentRegisterItem)
def update_equipment_register_item(
    equipment_id: str,
    payload: EquipmentRegisterUpsert,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_register(db)
    for index, item in enumerate(items):
        if item.get("id") == equipment_id:
            next_item = EquipmentRegisterItem(id=equipment_id, **payload.model_dump())
            items[index] = next_item.model_dump(mode="json")
            _save_register(db, items)
            return next_item
    raise HTTPException(status_code=404, detail="Equipment not found")


@router.get("/temperature-log", response_model=list[TemperatureLogRead])
def list_temperature_log(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    settings = get_workspace_settings(db)
    threshold_min = float(settings.iot_temp_min_c)
    threshold_max = float(settings.iot_temp_max_c)
    readings = (
        db.query(IotSensorReading)
        .filter(IotSensorReading.sensor_type == "temperature")
        .order_by(IotSensorReading.recorded_at.desc())
        .limit(200)
        .all()
    )

    rows: list[TemperatureLogRead] = []
    for reading in readings:
        metadata = reading.metadata_json if isinstance(reading.metadata_json, dict) else {}
        raw_battery_level = metadata.get("battery_level")
        battery_level = None
        if raw_battery_level is not None:
            try:
                battery_level = float(raw_battery_level)
            except (TypeError, ValueError):
                battery_level = None
        raw_calibration_due = metadata.get("calibration_due_at")
        calibration_due = None
        if isinstance(raw_calibration_due, str):
            try:
                from datetime import datetime

                calibration_due = datetime.fromisoformat(raw_calibration_due.replace("Z", "+00:00"))
            except ValueError:
                calibration_due = None

        rows.append(
            TemperatureLogRead(
                id=str(reading.id),
                outlet_id=str(reading.outlet_id),
                value=reading.value,
                unit=reading.unit,
                recorded_at=reading.recorded_at,
                status="pass" if threshold_min <= reading.value <= threshold_max else "fail",
                threshold_min=threshold_min,
                threshold_max=threshold_max,
                gateway_id=str(metadata.get("gateway_id")) if metadata.get("gateway_id") else None,
                gateway_status=str(metadata.get("gateway_status")) if metadata.get("gateway_status") else None,
                battery_level=battery_level,
                calibration_due_at=calibration_due,
            )
        )

    return rows
