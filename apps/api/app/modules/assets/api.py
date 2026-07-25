from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.assets.schemas import EquipmentHealthRead
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User as IdentityUser
from app.modules.iot.service import IotService

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("/equipment-health", response_model=list[EquipmentHealthRead])
def list_equipment_health(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user

    rows: list[EquipmentHealthRead] = []
    for sensor in IotService(db).list_sensor_health():
        equipment_id = f"{sensor.outlet_id}:{sensor.sensor_type}"
        equipment_name = sensor.sensor_type.replace("_", " ").title()
        rows.append(
            EquipmentHealthRead(
                id=equipment_id,
                name=equipment_name,
                outlet_id=sensor.outlet_id,
                category=sensor.sensor_type,
                status=sensor.status,
                latest_value=sensor.latest_value,
                unit=sensor.unit,
                last_seen_at=sensor.last_seen_at,
                calibration_due_at=sensor.calibration_due_at,
                gateway_id=sensor.gateway_id,
                message=sensor.message,
            )
        )

    return rows
