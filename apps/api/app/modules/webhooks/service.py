from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.webhooks.models import WebhookSubscription
from app.modules.webhooks.repository import WebhookRepository
from app.modules.webhooks.schemas import WEBHOOK_EVENT_TYPES, WebhookCreate, WebhookUpdate


class WebhookService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = WebhookRepository(db)

    def list_webhooks(self) -> list[WebhookSubscription]:
        return self.repository.list_all()

    def get_webhook(self, webhook_id) -> WebhookSubscription:
        webhook = self.repository.find_by_id(webhook_id)
        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook subscription not found",
            )
        return webhook

    def _validate_events(self, events: list[str]) -> None:
        invalid = [event for event in events if event not in WEBHOOK_EVENT_TYPES]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported webhook events: {', '.join(invalid)}",
            )

    def create_webhook(self, payload: WebhookCreate) -> WebhookSubscription:
        self._validate_events(payload.events)

        webhook = WebhookSubscription(
            url=payload.url.strip(),
            events=payload.events,
            secret=payload.secret,
            active=payload.active,
            outlet_id=payload.outlet_id,
            description=payload.description,
        )
        return self.repository.create(webhook)

    def update_webhook(self, webhook_id, payload: WebhookUpdate) -> WebhookSubscription:
        webhook = self.get_webhook(webhook_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "events" in update_data and update_data["events"] is not None:
            self._validate_events(update_data["events"])

        if "url" in update_data and isinstance(update_data["url"], str):
            update_data["url"] = update_data["url"].strip()

        for field, value in update_data.items():
            setattr(webhook, field, value)

        return self.repository.save(webhook)

    def delete_webhook(self, webhook_id) -> None:
        webhook = self.get_webhook(webhook_id)
        self.repository.delete(webhook)
