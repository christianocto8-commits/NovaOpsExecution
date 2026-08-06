from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.modules.identity.models import AuditLog


def was_seed_deleted(db: Session, *, action: str, title: str) -> bool:
    """Return True if a seed item with the given title was previously deleted.

    Relies on audit events written when a user deletes a schedule
    (``schedule.deleted``) or a form template (``form_template.deleted``),
    each carrying the title in their metadata. This prevents the startup
    bootstrap from resurrecting items the user intentionally removed.
    """
    if not title:
        return False

    rows = db.query(AuditLog).filter(AuditLog.action == action).all()
    for row in rows:
        if not row.metadata_json:
            continue
        try:
            metadata = json.loads(row.metadata_json)
        except (TypeError, ValueError):
            continue
        if metadata.get("title") == title:
            return True

    return False
