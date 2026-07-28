from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.models.task import Task
from app.modules.assets.schemas import (
    EquipmentHealthRead,
    EquipmentRegisterItem,
    EquipmentRegisterUpsert,
    TemperatureLogRead,
)
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OWNER_ROLE
from app.modules.identity.dependencies import require_permission
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.modules.notifications.task_notifications import _area_manager_has_outlet_access, _resolve_identity_outlet
from app.modules.tasks.identity_bridge import resolve_legacy_outlet_id, sync_identity_access
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
    if not register_item.sensor_enabled:
        status = "disabled"
    elif (
        register_item.battery_level is not None
        and register_item.battery_alert_threshold is not None
        and register_item.battery_level <= register_item.battery_alert_threshold
    ):
        status = "alert"
    return EquipmentHealthRead(
        id=register_item.id,
        name=register_item.name,
        outlet_id=register_item.outlet_id or "00000000-0000-0000-0000-000000000000",
        category=register_item.category,
        status=status,
        calibration_due_at=register_item.calibration_due_at,
        gateway_id=register_item.gateway_id,
        battery_level=register_item.battery_level,
        message=register_item.notes or "Registered asset without live sensor telemetry.",
    )


def _battery_alert_key(asset_id: str) -> str:
    return f"battery_alert:{asset_id}"


def _existing_battery_alert_task(db: Session, asset_id: str) -> Task | None:
    return (
        db.query(Task)
        .filter(
            Task.source_type == "sensor_battery_alert",
            Task.description.contains(_battery_alert_key(asset_id)),
            Task.status.notin_(["completed", "cancelled"]),
        )
        .first()
    )


def _notify_battery_alert_supervisors(
    db: Session,
    *,
    task: Task,
    asset: EquipmentRegisterItem,
) -> int:
    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {task.outlet_id}"
    roles = db.scalars(select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE, AREA_MANAGER_ROLE]))).all()
    role_ids = [role.id for role in roles]
    if not role_ids:
        return 0

    recipients = db.scalars(
        select(IdentityUser).where(
            IdentityUser.is_active.is_(True),
            IdentityUser.role_id.in_(role_ids),
        )
    ).all()
    subject = f"Battery sensor rendah: {asset.name}"
    body = (
        f"Battery asset {asset.name} di {outlet_label} "
        f"tersisa {asset.battery_level}% dan melewati threshold {asset.battery_alert_threshold}%."
    )
    sent = 0
    for recipient in recipients:
        role_slug = recipient.role.slug if recipient.role else ""
        if role_slug == AREA_MANAGER_ROLE and not _area_manager_has_outlet_access(recipient, identity_outlet):
            continue

        payload = {
            "task_id": task.id,
            "asset_id": asset.id,
            "asset_name": asset.name,
            "battery_level": asset.battery_level,
            "battery_alert_threshold": asset.battery_alert_threshold,
            "event_type": "sensor_battery_alert",
        }
        NotificationService(db).create_event(
            NotificationEventCreate(
                event_type="sensor_battery_alert",
                source_module="assets",
                source_entity_type="equipment",
                source_entity_id=asset.id,
                recipient_user_id=recipient.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )
        PushNotificationService(db).send_to_user(
            recipient.id,
            title=subject,
            body=body,
            url=f"/dashboard/tasks?taskId={task.id}",
            data=payload,
        )
        sent += 1
    return sent


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


@router.post("/equipment/{equipment_id}/request-replacement", response_model=EquipmentRegisterItem)
def request_equipment_replacement(
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_register(db)
    for index, item in enumerate(items):
        if item.get("id") == equipment_id:
            next_item = EquipmentRegisterItem(**item)
            next_item.replacement_approval_status = "pending"
            next_item.replacement_requested_at = datetime.now(timezone.utc)
            items[index] = next_item.model_dump(mode="json")
            _save_register(db, items)
            return next_item
    raise HTTPException(status_code=404, detail="Equipment not found")


@router.post("/equipment/{equipment_id}/approve-replacement", response_model=EquipmentRegisterItem)
def approve_equipment_replacement(
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    del current_user
    items = _load_register(db)
    for index, item in enumerate(items):
        if item.get("id") == equipment_id:
            next_item = EquipmentRegisterItem(**item)
            next_item.replacement_approval_status = "approved"
            next_item.replacement_approved_at = datetime.now(timezone.utc)
            items[index] = next_item.model_dump(mode="json")
            _save_register(db, items)
            return next_item
    raise HTTPException(status_code=404, detail="Equipment not found")


def process_registered_battery_alerts(
    db: Session,
    current_user: IdentityUser | None = None,
) -> dict:
    actor = current_user
    if actor is None:
        actor = db.scalars(
            select(IdentityUser)
            .join(Role, Role.id == IdentityUser.role_id)
            .where(IdentityUser.is_active.is_(True), Role.slug.in_([OWNER_ROLE, ADMIN_ROLE]))
            .order_by(IdentityUser.created_at.asc())
        ).first()
    if actor is None:
        return {"created_tasks": 0, "skipped_existing": 0, "notifications_sent": 0}

    legacy_user, _, _ = sync_identity_access(db, actor)
    created_tasks = 0
    skipped_existing = 0
    notifications_sent = 0
    registered = [EquipmentRegisterItem(**item) for item in _load_register(db)]

    for asset in registered:
        if not asset.sensor_enabled or asset.battery_level is None or asset.battery_alert_threshold is None:
            continue
        if asset.battery_level > asset.battery_alert_threshold:
            continue
        if not asset.outlet_id:
            continue
        existing = _existing_battery_alert_task(db, asset.id)
        if existing:
            skipped_existing += 1
            continue

        try:
            legacy_outlet_id = resolve_legacy_outlet_id(db, asset.outlet_id)
        except (TypeError, ValueError):
            continue

        task = Task(
            title=f"Replace/check battery sensor: {asset.name}",
            description=(
                f"{_battery_alert_key(asset.id)}\n"
                f"Battery sensor {asset.name} berada di {asset.battery_level}% "
                f"(threshold {asset.battery_alert_threshold}%). "
                "Periksa gateway/sensor, ganti battery jika perlu, lalu unggah evidence."
            ),
            outlet_id=legacy_outlet_id,
            assigned_to=None,
            created_by=legacy_user.id,
            source_type="sensor_battery_alert",
            source_id=None,
            priority="high",
            status="open",
        )
        db.add(task)
        db.flush()
        created_tasks += 1
        notifications_sent += _notify_battery_alert_supervisors(db, task=task, asset=asset)

    db.commit()
    return {
        "created_tasks": created_tasks,
        "skipped_existing": skipped_existing,
        "notifications_sent": notifications_sent,
    }


@router.post("/process-battery-alerts")
def process_battery_alerts(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("settings.manage")),
):
    return process_registered_battery_alerts(db, current_user)


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
