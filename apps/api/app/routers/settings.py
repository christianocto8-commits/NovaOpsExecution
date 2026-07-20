from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import get_current_active_user, require_role
from app.modules.identity.models import User as IdentityUser
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.workspace_settings import (
    get_or_create_settings_row,
    get_workspace_settings,
    update_workspace_settings,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    get_or_create_settings_row(db)
    return get_workspace_settings(db)


@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    return update_workspace_settings(db, payload)
