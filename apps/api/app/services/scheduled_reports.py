from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings
from app.schemas.reports import ScheduledReportConfig
from app.services.digest_email import send_compliance_digest

SCHEDULED_REPORT_KEY = "scheduled_report_config"


def _load_config(db: Session) -> ScheduledReportConfig:
    row = db.query(AppSettings).filter(AppSettings.key == SCHEDULED_REPORT_KEY).first()
    if not row:
        return ScheduledReportConfig()
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return ScheduledReportConfig()
    return ScheduledReportConfig(**payload)


def _save_config(db: Session, config: ScheduledReportConfig) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == SCHEDULED_REPORT_KEY).first()
    payload = json.dumps(config.model_dump(), default=str)
    if row:
        row.payload = payload
    else:
        row = AppSettings(key=SCHEDULED_REPORT_KEY, payload=payload)
        db.add(row)
    db.commit()


def _is_due(config: ScheduledReportConfig, now: datetime) -> bool:
    if not config.last_sent_at:
        return True
    try:
        last_sent = datetime.fromisoformat(config.last_sent_at.replace("Z", "+00:00"))
    except ValueError:
        return True
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)

    intervals = {
        "daily": timedelta(days=1),
        "weekly": timedelta(days=7),
        "monthly": timedelta(days=30),
    }
    return last_sent + intervals.get(config.frequency, timedelta(days=1)) <= now


def process_scheduled_reports(db: Session) -> dict:
    config = _load_config(db)
    now = datetime.now(timezone.utc)
    if not config.enabled:
        return {"sent": False, "reason": "Scheduled reports disabled"}
    if not _is_due(config, now):
        return {"sent": False, "reason": "Scheduled report not due yet"}

    result = send_compliance_digest(db, force=True)
    if result.get("sent"):
        config.last_sent_at = now.isoformat()
        _save_config(db, config)

    return {
        **result,
        "format": config.format,
        "include_evidence_bundle": config.include_evidence_bundle,
        "configured_recipients": len(config.recipients),
    }
