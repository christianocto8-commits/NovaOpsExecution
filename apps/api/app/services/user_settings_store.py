from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings


def _settings_key(user_id: UUID, namespace: str) -> str:
    return f"{namespace}:{user_id}"


def get_user_settings(db: Session, user_id: UUID, namespace: str, defaults: dict) -> dict:
    key = _settings_key(user_id, namespace)
    row = db.query(AppSettings).filter(AppSettings.key == key).first()

    if not row:
        return defaults.copy()

    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return defaults.copy()

    if not isinstance(payload, dict):
        return defaults.copy()

    return {**defaults, **payload}


def save_user_settings(db: Session, user_id: UUID, namespace: str, payload: dict) -> dict:
    key = _settings_key(user_id, namespace)
    row = db.query(AppSettings).filter(AppSettings.key == key).first()

    if row:
        row.payload = json.dumps(payload)
    else:
        row = AppSettings(key=key, payload=json.dumps(payload))
        db.add(row)

    db.commit()
    db.refresh(row)

    try:
        return json.loads(row.payload)
    except json.JSONDecodeError:
        return payload
