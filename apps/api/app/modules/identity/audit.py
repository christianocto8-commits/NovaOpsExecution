from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.identity.models import AuditLog


SENSITIVE_METADATA_KEYS = {
    "access_token",
    "authorization",
    "password",
    "refresh_token",
    "token",
    "token_hash",
}


def _redact_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}

    for key, value in metadata.items():
        if key.lower() in SENSITIVE_METADATA_KEYS:
            redacted[key] = "[redacted]"
        else:
            redacted[key] = value

    return redacted


def record_identity_audit_event(
    db: Session,
    *,
    action: str,
    resource_type: str,
    actor_user_id: UUID | None = None,
    organization_id: UUID | None = None,
    outlet_id: UUID | None = None,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    safe_metadata = _redact_metadata(metadata or {})
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            organization_id=organization_id,
            outlet_id=outlet_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=json.dumps(safe_metadata, default=str),
        )
    )
