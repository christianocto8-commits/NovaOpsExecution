from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.modules.api_keys.service import ApiKeyService
from app.modules.identity.dependencies import require_permission, require_role
from app.modules.identity.models import User as IdentityUser
from app.modules.iot.schemas import (
    IotEvaluateRequest,
    IotEvaluateResult,
    IotReadingIngest,
    IotReadingRead,
    IotSensorHealthRead,
)
from app.modules.iot.service import IotService
from app.modules.tasks.identity_bridge import get_accessible_identity_outlets

router = APIRouter(prefix="/iot", tags=["IoT"])


def _verify_iot_ingest_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> None:
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-API-Key header")

    settings = get_settings()
    if settings.iot_ingest_api_key and x_api_key == settings.iot_ingest_api_key:
        return

    api_key = ApiKeyService(db).authenticate(x_api_key, required_scope="iot:ingest")
    if api_key:
        return

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@router.post("/ingest", response_model=IotReadingRead, status_code=status.HTTP_201_CREATED)
def ingest_iot_reading(
    payload: IotReadingIngest,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_iot_ingest_key),
):
    return IotService(db).ingest(payload)


def _accessible_outlet_ids_for_user(
    db: Session,
    current_user: IdentityUser,
) -> tuple[set[UUID] | None, bool]:
    outlets, full_access = get_accessible_identity_outlets(
        db, current_user, include_head_office_full_access=False
    )
    if full_access:
        return None, True
    return {outlet.id for outlet in outlets}, False


@router.get("/readings", response_model=list[IotReadingRead])
def list_iot_readings(
    outlet_id: UUID | None = None,
    sensor_type: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    accessible_ids, full_access = _accessible_outlet_ids_for_user(db, current_user)
    if outlet_id is not None and not full_access and outlet_id not in (accessible_ids or set()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet",
        )

    return IotService(db).list_readings(
        outlet_id=outlet_id,
        sensor_type=sensor_type,
        limit=limit,
        accessible_outlet_ids=None if full_access else list(accessible_ids or set()),
    )


@router.get("/health", response_model=list[IotSensorHealthRead])
def list_iot_sensor_health(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    accessible_ids, full_access = _accessible_outlet_ids_for_user(db, current_user)
    return IotService(db).list_sensor_health(
        accessible_outlet_ids=None if full_access else list(accessible_ids or set()),
    )


@router.post("/evaluate", response_model=IotEvaluateResult)
def evaluate_iot_readings(
    payload: IotEvaluateRequest,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return IotService(db).evaluate(payload)
