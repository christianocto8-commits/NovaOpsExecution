from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.services.workspace_settings import get_workspace_settings

DEFAULT_TIMEZONE = "Asia/Jakarta"


def get_workspace_timezone(db: Session) -> ZoneInfo:
    settings = get_workspace_settings(db)
    try:
        return ZoneInfo(settings.timezone or DEFAULT_TIMEZONE)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def now_local(db: Session) -> datetime:
    """Current timestamp in the workspace local timezone (WIB by default)."""
    return datetime.now(get_workspace_timezone(db))
