from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.webhooks.models import WebhookSubscription


class WebhookRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[WebhookSubscription]:
        return list(
            self.db.scalars(
                select(WebhookSubscription).order_by(WebhookSubscription.created_at.desc())
            ).all()
        )

    def find_by_id(self, webhook_id: UUID) -> WebhookSubscription | None:
        return self.db.get(WebhookSubscription, webhook_id)

    def create(self, webhook: WebhookSubscription) -> WebhookSubscription:
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        return webhook

    def save(self, webhook: WebhookSubscription) -> WebhookSubscription:
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        return webhook

    def delete(self, webhook: WebhookSubscription) -> None:
        self.db.delete(webhook)
        self.db.commit()

    def list_active_for_event(
        self,
        event_type: str,
        outlet_id: int | None = None,
    ) -> list[WebhookSubscription]:
        statement = select(WebhookSubscription).where(WebhookSubscription.active.is_(True))
        subscriptions = list(self.db.scalars(statement).all())

        matched: list[WebhookSubscription] = []
        for subscription in subscriptions:
            events = subscription.events or []
            if event_type not in events:
                continue
            if subscription.outlet_id is not None and subscription.outlet_id != outlet_id:
                continue
            matched.append(subscription)

        return matched
