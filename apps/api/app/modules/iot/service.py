from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.iot.models import IotSensorReading
from app.modules.iot.schemas import IotEvaluateRequest, IotEvaluateResult, IotReadingIngest
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
