from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.iot.models import IotSensorReading
from app.modules.iot.schemas import IotEvaluateRequest, IotEvaluateResult, IotReadingIngest, IotSensorHealthRead
from app.services.workspace_settings import get_workspace_settings


class IotService:
    def __init__(self, db: Session):
        self.db = db

    def ingest(self, payload: IotReadingIngest) -> IotSensorReading:
        reading = IotSensorReading(
            outlet_id=payload.outlet_id,
            sensor_type=payload.sensor_type.strip().lower(),
            value=payload.value,
            unit=payload.unit,
            recorded_at=payload.recorded_at or datetime.now(UTC),
            metadata_json=payload.metadata_json,
        )
        self.db.add(reading)
        self.db.commit()
        self.db.refresh(reading)
        return reading

    def list_readings(
        self,
        *,
        outlet_id: UUID | None = None,
        sensor_type: str | None = None,
        limit: int = 100,
    ) -> list[IotSensorReading]:
        statement = select(IotSensorReading).order_by(IotSensorReading.recorded_at.desc())

        if outlet_id:
            statement = statement.where(IotSensorReading.outlet_id == outlet_id)

        if sensor_type:
            statement = statement.where(IotSensorReading.sensor_type == sensor_type.strip().lower())

        statement = statement.limit(min(max(limit, 1), 500))
        return list(self.db.scalars(statement).all())

    def evaluate(self, payload: IotEvaluateRequest) -> IotEvaluateResult:
        settings = get_workspace_settings(self.db)
        threshold_min = float(getattr(settings, "iot_temp_min_c", 2))
        threshold_max = float(getattr(settings, "iot_temp_max_c", 8))

        readings = self.list_readings(
            outlet_id=payload.outlet_id,
            sensor_type=payload.sensor_type,
            limit=1,
        )

        if not readings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No sensor readings found for evaluation",
            )

        latest = readings[0]
        within = threshold_min <= latest.value <= threshold_max
        flagged = not within

        return IotEvaluateResult(
            outlet_id=latest.outlet_id,
            sensor_type=latest.sensor_type,
            latest_value=latest.value,
            unit=latest.unit,
            recorded_at=latest.recorded_at,
            within_threshold=within,
            threshold_min=threshold_min,
            threshold_max=threshold_max,
            flagged=flagged,
            message=(
                "Reading within acceptable range"
                if within
                else f"Reading {latest.value}{latest.unit or ''} outside {threshold_min}-{threshold_max}"
            ),
        )

    def list_sensor_health(self) -> list[IotSensorHealthRead]:
        settings = get_workspace_settings(self.db)
        threshold_min = float(getattr(settings, "iot_temp_min_c", 2))
        threshold_max = float(getattr(settings, "iot_temp_max_c", 8))
        readings = self.list_readings(limit=500)
        latest_by_sensor: dict[tuple[UUID, str], IotSensorReading] = {}

        for reading in readings:
            key = (reading.outlet_id, reading.sensor_type)
            current = latest_by_sensor.get(key)
            if current is None or reading.recorded_at > current.recorded_at:
                latest_by_sensor[key] = reading

        now = datetime.now(UTC)
        health_rows: list[IotSensorHealthRead] = []
        for (outlet_id, sensor_type), reading in latest_by_sensor.items():
            recorded_at = reading.recorded_at
            if recorded_at.tzinfo is None:
                recorded_at = recorded_at.replace(tzinfo=UTC)
            minutes_since_seen = max(0, round((now - recorded_at).total_seconds() / 60))
            status = "online"
            if minutes_since_seen > 180:
                status = "offline"
            elif minutes_since_seen > 60:
                status = "stale"

            within_threshold: bool | None = None
            row_threshold_min: float | None = None
            row_threshold_max: float | None = None
            if sensor_type == "temperature":
                within_threshold = threshold_min <= reading.value <= threshold_max
                row_threshold_min = threshold_min
                row_threshold_max = threshold_max
                if not within_threshold:
                    status = "alert"

            metadata = reading.metadata_json or {}
            calibration_due = None
            raw_calibration_due = metadata.get("calibration_due_at") if isinstance(metadata, dict) else None
            if isinstance(raw_calibration_due, str):
                try:
                    calibration_due = datetime.fromisoformat(raw_calibration_due.replace("Z", "+00:00"))
                except ValueError:
                    calibration_due = None
            gateway_id = metadata.get("gateway_id") if isinstance(metadata, dict) else None
            gateway_status = metadata.get("gateway_status") if isinstance(metadata, dict) else None
            raw_battery_level = metadata.get("battery_level") if isinstance(metadata, dict) else None
            battery_level = None
            if raw_battery_level is not None:
                try:
                    battery_level = float(raw_battery_level)
                except (TypeError, ValueError):
                    battery_level = None

            health_rows.append(
                IotSensorHealthRead(
                    outlet_id=outlet_id,
                    sensor_type=sensor_type,
                    latest_value=reading.value,
                    unit=reading.unit,
                    last_seen_at=recorded_at,
                    minutes_since_seen=minutes_since_seen,
                    status=status,
                    within_threshold=within_threshold,
                    threshold_min=row_threshold_min,
                    threshold_max=row_threshold_max,
                    calibration_due_at=calibration_due,
                    gateway_id=str(gateway_id) if gateway_id else None,
                    gateway_status=str(gateway_status) if gateway_status else None,
                    battery_level=battery_level,
                    message=f"Last seen {minutes_since_seen} minutes ago",
                )
            )

        return sorted(health_rows, key=lambda row: (row.status != "alert", row.status, row.sensor_type))
