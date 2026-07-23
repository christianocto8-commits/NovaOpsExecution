from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from urllib import error, request
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.webhooks.models import WebhookDelivery, WebhookSubscription
from app.modules.webhooks.repository import WebhookRepository
from app.services.workspace_settings import get_workspace_settings

logger = logging.getLogger(__name__)

MAX_DELIVERY_ATTEMPTS = 2
RETRY_DELAY_SECONDS = 1.0


def _sign_payload(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _post_webhook(url: str, secret: str, payload: dict) -> int:
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
        status = response.status
        if status >= 400:
            raise RuntimeError(f"Webhook returned HTTP {status}")
        return status


def _record_delivery(
    db: Session,
    *,
    subscription: WebhookSubscription,
    event_type: str,
    envelope: dict,
    attempt_count: int,
    status: str,
    http_status: int | None,
    error_message: str | None,
) -> None:
    delivery = WebhookDelivery(
        subscription_id=subscription.id,
        event_type=event_type,
        url=subscription.url,
        status=status,
        attempt_count=attempt_count,
        http_status=http_status,
        error_message=error_message,
        payload=envelope,
        delivered_at=datetime.now(timezone.utc) if status == "delivered" else None,
    )
    db.add(delivery)
    db.commit()


def _deliver_with_retry(
    db: Session,
    *,
    subscription: WebhookSubscription,
    event_type: str,
    envelope: dict,
) -> bool:
    last_error: str | None = None
    last_status: int | None = None

    for attempt in range(1, MAX_DELIVERY_ATTEMPTS + 1):
        try:
            http_status = _post_webhook(subscription.url, subscription.secret, envelope)
            _record_delivery(
                db,
                subscription=subscription,
                event_type=event_type,
                envelope=envelope,
                attempt_count=attempt,
                status="delivered",
                http_status=http_status,
                error_message=None,
            )
            return True
        except Exception as exc:
            last_error = str(exc)
            if isinstance(exc, error.HTTPError):
                last_status = exc.code

            if attempt < MAX_DELIVERY_ATTEMPTS:
                time.sleep(RETRY_DELAY_SECONDS)
                continue

            _record_delivery(
                db,
                subscription=subscription,
                event_type=event_type,
                envelope=envelope,
                attempt_count=attempt,
                status="failed",
                http_status=last_status,
                error_message=last_error,
            )
            logger.warning(
                "Webhook delivery failed for %s event=%s after %s attempts: %s",
                subscription.url,
                event_type,
                attempt,
                last_error,
            )

    return False


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
        if _deliver_with_retry(
            db,
            subscription=subscription,
            event_type=event_type,
            envelope=envelope,
        ):
            delivered += 1

    return delivered


def list_recent_deliveries(
    db: Session,
    *,
    limit: int = 50,
    subscription_id: UUID | None = None,
) -> list[WebhookDelivery]:
    repository = WebhookRepository(db)
    return repository.list_recent_deliveries(limit=limit, subscription_id=subscription_id)


def send_test_webhook(
    db: Session,
    *,
    subscription: WebhookSubscription,
) -> tuple[bool, int | None, str | None]:
    envelope = {
        "event": "webhook.test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "message": "NovaOps webhook test ping",
            "subscription_id": str(subscription.id),
        },
    }

    delivered = _deliver_with_retry(
        db,
        subscription=subscription,
        event_type="webhook.test",
        envelope=envelope,
    )

    latest = list_recent_deliveries(db, limit=1, subscription_id=subscription.id)
    if latest:
        record = latest[0]
        return delivered, record.http_status, record.error_message

    return delivered, None, None
