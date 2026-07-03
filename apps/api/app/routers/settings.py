from fastapi import APIRouter

from app.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

_current_settings = SettingsResponse()


@router.get("", response_model=SettingsResponse)
def get_settings():
    return _current_settings


@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate):
    global _current_settings

    update_data = payload.model_dump(exclude_unset=True)

    _current_settings = _current_settings.model_copy(update=update_data)

    return _current_settings