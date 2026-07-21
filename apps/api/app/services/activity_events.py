from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.activity_event import ActivityEvent


def record_activity_event(
    db: Session,
    *,
    action: str,
    summary: str,
    outlet_id: int | None = None,
    actor_id: int | None = None,
    actor_name: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict | None = None,
    occurred_at: datetime | None = None,
    commit: bool = True,
) -> ActivityEvent:
    event = ActivityEvent(
        action=action,
        summary=summary,
        outlet_id=outlet_id,
        actor_id=actor_id,
        actor_name=actor_name,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=metadata,
        occurred_at=occurred_at or datetime.now(timezone.utc),
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    return event
