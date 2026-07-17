from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import PushSubscription


class PushSubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_endpoint(self, endpoint: str) -> PushSubscription | None:
        statement = select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        return self.db.scalar(statement)

    def list_for_user(self, user_id: UUID) -> list[PushSubscription]:
        statement = (
            select(PushSubscription)
            .where(PushSubscription.user_id == user_id)
            .order_by(PushSubscription.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def upsert(
        self,
        *,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
        outlet_id: UUID | None = None,
        user_agent: str | None = None,
    ) -> PushSubscription:
        existing = self.find_by_endpoint(endpoint)

        if existing:
            existing.user_id = user_id
            existing.p256dh = p256dh
            existing.auth = auth
            existing.outlet_id = outlet_id
            existing.user_agent = user_agent
            self.db.commit()
            self.db.refresh(existing)
            return existing

        subscription = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            outlet_id=outlet_id,
            user_agent=user_agent,
        )
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def delete_by_endpoint(self, endpoint: str, user_id: UUID) -> bool:
        subscription = self.find_by_endpoint(endpoint)

        if not subscription or subscription.user_id != user_id:
            return False

        self.db.delete(subscription)
        self.db.commit()
        return True

    def delete(self, subscription: PushSubscription) -> None:
        self.db.delete(subscription)
        self.db.commit()
