from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import require_role
from app.modules.identity.models import User as IdentityUser
from app.modules.webhooks.schemas import (
    WebhookCreate,
    WebhookDeliveryRead,
    WebhookRead,
    WebhookReadWithSecret,
    WebhookTestResponse,
    WebhookUpdate,
)
from app.services.webhook_dispatcher import list_recent_deliveries, retry_webhook_delivery, send_test_webhook
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("", response_model=list[WebhookRead])
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return WebhookService(db).list_webhooks()


@router.get("/deliveries", response_model=list[WebhookDeliveryRead])
def list_webhook_deliveries(
    limit: int = 50,
    subscription_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return list_recent_deliveries(
        db,
        limit=min(max(limit, 1), 200),
        subscription_id=subscription_id,
    )


@router.post("", response_model=WebhookReadWithSecret, status_code=status.HTTP_201_CREATED)
def create_webhook(
    payload: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return WebhookService(db).create_webhook(payload)


@router.get("/{webhook_id}", response_model=WebhookReadWithSecret)
def get_webhook(
    webhook_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return WebhookService(db).get_webhook(webhook_id)


@router.put("/{webhook_id}", response_model=WebhookReadWithSecret)
def update_webhook(
    webhook_id: UUID,
    payload: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return WebhookService(db).update_webhook(webhook_id, payload)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    WebhookService(db).delete_webhook(webhook_id)
    return None


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
def test_webhook(
    webhook_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    subscription = WebhookService(db).get_webhook(webhook_id)
    delivered, http_status, error_message = send_test_webhook(db, subscription=subscription)

    return WebhookTestResponse(
        delivered=delivered,
        http_status=http_status,
        error_message=error_message,
    )


@router.post("/deliveries/{delivery_id}/retry", response_model=WebhookTestResponse)
def retry_delivery(
    delivery_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    try:
        delivered, http_status, error_message = retry_webhook_delivery(db, delivery_id=delivery_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return WebhookTestResponse(
        delivered=delivered,
        event_type="webhook.retry",
        http_status=http_status,
        error_message=error_message,
    )
