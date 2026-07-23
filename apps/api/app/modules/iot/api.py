from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.modules.api_keys.service import ApiKeyService
from app.modules.identity.dependencies import require_permission, require_role
from app.modules.identity.models import User as IdentityUser
from app.modules.iot.schemas import IotEvaluateRequest, IotEvaluateResult, IotReadingIngest, IotReadingRead
from app.modules.iot.service import IotService

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


@router.get("/readings", response_model=list[IotReadingRead])
def list_iot_readings(
    outlet_id: UUID | None = None,
    sensor_type: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    del current_user
    return IotService(db).list_readings(
        outlet_id=outlet_id,
        sensor_type=sensor_type,
        limit=limit,
    )


@router.post("/evaluate", response_model=IotEvaluateResult)
def evaluate_iot_readings(
    payload: IotEvaluateRequest,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return IotService(db).evaluate(payload)
