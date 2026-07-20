from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from urllib import error, request

from sqlalchemy.orm import Session

from app.modules.webhooks.repository import WebhookRepository
from app.services.workspace_settings import get_workspace_settings

logger = logging.getLogger(__name__)


def _sign_payload(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _post_webhook(url: str, secret: str, payload: dict) -> None:
    body = json.dumps(payload, default=str).encode("utf-8")
    signature = _sign_payload(secret, body)

    http_request = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-NovaOps-Signature": signature,
            "User-Agent": "NovaOps-Webhooks/1.0",
        },
        method="POST",
    )

    with request.urlopen(http_request, timeout=10) as response:
        if response.status >= 400:
            raise RuntimeError(f"Webhook returned HTTP {response.status}")


def dispatch_webhook_event(
    db: Session,
    *,
    event_type: str,
    payload: dict,
    outlet_id: int | None = None,
) -> int:
    settings = get_workspace_settings(db)
    if not settings.webhook_enabled:
        return 0

    repository = WebhookRepository(db)
    subscriptions = repository.list_active_for_event(event_type, outlet_id=outlet_id)

    envelope = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }

    delivered = 0
    for subscription in subscriptions:
        try:
            _post_webhook(subscription.url, subscription.secret, envelope)
            delivered += 1
        except Exception as exc:
            logger.warning(
                "Webhook delivery failed for %s event=%s: %s",
                subscription.url,
                event_type,
                exc,
            )

    return delivered
