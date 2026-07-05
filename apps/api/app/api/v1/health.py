from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": get_settings().app_name,
        "version": get_settings().app_version,
    }
