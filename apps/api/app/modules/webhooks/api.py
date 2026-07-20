from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import require_role
from app.modules.identity.models import User as IdentityUser
from app.modules.webhooks.schemas import WebhookCreate, WebhookRead, WebhookReadWithSecret, WebhookUpdate
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("", response_model=list[WebhookRead])
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return WebhookService(db).list_webhooks()


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
