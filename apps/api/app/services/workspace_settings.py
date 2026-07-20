import json

from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings
from app.schemas.settings import SettingsResponse, SettingsUpdate

SETTINGS_KEY = "workspace"


def get_workspace_settings(db: Session) -> SettingsResponse:
    row = db.query(AppSettings).filter(AppSettings.key == SETTINGS_KEY).first()

    if not row:
        return SettingsResponse()

    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        payload = {}

    return SettingsResponse(**payload)


def get_or_create_settings_row(db: Session) -> AppSettings:
    row = db.query(AppSettings).filter(AppSettings.key == SETTINGS_KEY).first()

    if row:
        return row

    row = AppSettings(
        key=SETTINGS_KEY,
        payload=json.dumps(SettingsResponse().model_dump()),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_workspace_settings(db: Session, payload: SettingsUpdate) -> SettingsResponse:
    row = get_or_create_settings_row(db)
    current = get_workspace_settings(db)
    update_data = payload.model_dump(exclude_unset=True)
    next_settings = current.model_copy(update=update_data)

    row.payload = json.dumps(next_settings.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    return get_workspace_settings(db)


def get_max_upload_bytes(db: Session) -> int:
    settings = get_workspace_settings(db)
    return max(1, settings.max_upload_mb) * 1024 * 1024
