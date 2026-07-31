from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_optional_api_key
from app.db.session import get_db
from app.modules.api_keys.models import ApiKey

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check(
    api_key: ApiKey | None = Depends(get_optional_api_key),
) -> dict[str, str]:
    payload = {
        "status": "ok",
        "service": get_settings().app_name,
        "version": get_settings().app_version,
    }

    if api_key is not None:
        payload["auth"] = "api_key"
        payload["key_name"] = api_key.name

    return payload


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "database": "unavailable"},
        ) from exc

    return {
        "status": "ready",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "database": "ok",
        "checked_at": datetime.now(UTC).isoformat(),
    }
