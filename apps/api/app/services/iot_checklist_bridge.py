from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outlet import Outlet as LegacyOutlet
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.iot.models import IotSensorReading
from app.schemas.settings import SettingsResponse


def resolve_identity_outlet_id(db: Session, legacy_outlet_id: int) -> UUID | None:
    legacy = db.query(LegacyOutlet).filter(LegacyOutlet.id == legacy_outlet_id).first()
    if not legacy:
        return None

    identity = db.scalar(
        select(IdentityOutlet).where(IdentityOutlet.code == legacy.code.strip().upper())
    )
    return identity.id if identity else None


def get_latest_temperature_reading(
    db: Session,
    *,
    identity_outlet_id: UUID,
    max_age_hours: int = 24,
) -> IotSensorReading | None:
    cutoff = datetime.now(UTC) - timedelta(hours=max_age_hours)
    return db.scalar(
        select(IotSensorReading)
        .where(
            IotSensorReading.outlet_id == identity_outlet_id,
            IotSensorReading.sensor_type == "temperature",
            IotSensorReading.recorded_at >= cutoff,
        )
        .order_by(IotSensorReading.recorded_at.desc())
        .limit(1)
    )


def build_iot_failed_items(
    db: Session,
    *,
    legacy_outlet_id: int,
    settings: SettingsResponse,
) -> list[dict[str, Any]]:
    if not getattr(settings, "iot_auto_fail_enabled", True):
        return []

    identity_outlet_id = resolve_identity_outlet_id(db, legacy_outlet_id)
    if not identity_outlet_id:
        return []

    reading = get_latest_temperature_reading(db, identity_outlet_id=identity_outlet_id)
    if not reading:
        return []

    threshold_min = float(getattr(settings, "iot_temp_min_c", 2.0))
    threshold_max = float(getattr(settings, "iot_temp_max_c", 8.0))

    if threshold_min <= reading.value <= threshold_max:
        return []

    unit = reading.unit or "°C"
    return [
        {
            "field_id": "iot:temperature",
            "label": "Cold chain sensor (IoT)",
            "value": reading.value,
            "reason": (
                f"Latest probe reading {reading.value}{unit} outside "
                f"{threshold_min}-{threshold_max}{unit} at {reading.recorded_at.isoformat()}"
            ),
            "critical": True,
            "source": "iot",
        }
    ]


def merge_iot_failures_into_checklist(
    checklist_result: dict[str, Any],
    iot_failures: list[dict[str, Any]],
    *,
    pass_threshold: int,
) -> dict[str, Any]:
    if not iot_failures:
        return checklist_result

    merged = dict(checklist_result)
    failed_items = list(merged.get("failed_items") or [])
    failed_items.extend(iot_failures)
    merged["failed_items"] = failed_items
    merged["failed_count"] = len(failed_items)
    merged["iot_flagged"] = True

    score = int(merged.get("score") or 100)
    merged["score"] = min(score, max(0, pass_threshold - 1))
    merged["status"] = "fail"

    critical = list(merged.get("critical_failures") or [])
    critical.extend(iot_failures)
    merged["critical_failures"] = critical

    return merged
