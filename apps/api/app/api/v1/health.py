from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.deps import get_optional_api_key
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
