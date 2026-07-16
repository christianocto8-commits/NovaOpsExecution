import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import Base, engine, get_db
from app.models.app_settings import AppSettings
from app.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

SETTINGS_KEY = "workspace"
Base.metadata.create_all(bind=engine, tables=[AppSettings.__table__])


def _get_or_create_settings_row(db: Session) -> AppSettings:
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


def _read_settings(row: AppSettings) -> SettingsResponse:
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        payload = {}

    return SettingsResponse(**payload)


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    row = _get_or_create_settings_row(db)
    return _read_settings(row)


@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    row = _get_or_create_settings_row(db)
    current = _read_settings(row)
    update_data = payload.model_dump(exclude_unset=True)
    next_settings = current.model_copy(update=update_data)

    row.payload = json.dumps(next_settings.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    return _read_settings(row)
