from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import (
    NotificationDelivery,
    NotificationEvent,
    NotificationStatus,
    NotificationTemplate,
)


class NotificationTemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[NotificationTemplate]:
        statement = select(NotificationTemplate).order_by(NotificationTemplate.created_at.desc())
        return list(self.db.scalars(statement).all())

    def find_by_id(self, template_id: UUID) -> NotificationTemplate | None:
        statement = select(NotificationTemplate).where(NotificationTemplate.id == template_id)
        return self.db.scalar(statement)

    def find_by_code(self, code: str) -> NotificationTemplate | None:
        statement = select(NotificationTemplate).where(NotificationTemplate.code == code.strip().lower())
        return self.db.scalar(statement)

    def create(self, template: NotificationTemplate) -> NotificationTemplate:
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def save(self, template: NotificationTemplate) -> NotificationTemplate:
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template: NotificationTemplate) -> None:
        self.db.delete(template)
        self.db.commit()


class NotificationEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[NotificationEvent]:
        statement = select(NotificationEvent).order_by(NotificationEvent.created_at.desc())
        return list(self.db.scalars(statement).all())

    def create(self, event: NotificationEvent) -> NotificationEvent:
        self.db.add(event)
        self.db.flush()
        return event


class NotificationDeliveryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: UUID) -> list[NotificationDelivery]:
        statement = (
            select(NotificationDelivery)
            .where(NotificationDelivery.recipient_user_id == user_id)
            .order_by(NotificationDelivery.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def list_pending(self) -> list[NotificationDelivery]:
        statement = (
            select(NotificationDelivery)
            .where(NotificationDelivery.status == NotificationStatus.pending)
            .order_by(NotificationDelivery.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def create(self, delivery: NotificationDelivery) -> NotificationDelivery:
        self.db.add(delivery)
        self.db.flush()
        return delivery

    def save(self, delivery: NotificationDelivery) -> NotificationDelivery:
        self.db.add(delivery)
        self.db.commit()
        self.db.refresh(delivery)
        return delivery
