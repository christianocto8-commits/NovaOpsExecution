from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.notifications.models import (
    NotificationDelivery,
    NotificationEvent,
    NotificationStatus,
    NotificationTemplate,
)
from app.modules.notifications.repository import (
    NotificationDeliveryRepository,
    NotificationEventRepository,
    NotificationTemplateRepository,
)
from app.modules.notifications.schemas import (
    NotificationEventCreate,
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
)


class NotificationTemplateService:
    def __init__(self, db: Session):
        self.repository = NotificationTemplateRepository(db)

    def list_templates(self) -> list[NotificationTemplate]:
        return self.repository.list()

    def get_template(self, template_id: UUID) -> NotificationTemplate:
        template = self.repository.find_by_id(template_id)

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found",
            )

        return template

    def create_template(self, payload: NotificationTemplateCreate) -> NotificationTemplate:
        code = payload.code.strip().lower()

        if self.repository.find_by_code(code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Notification template code already exists",
            )

        template = NotificationTemplate(
            code=code,
            name=payload.name.strip(),
            channel=payload.channel,
            subject_template=payload.subject_template,
            body_template=payload.body_template,
            is_active=payload.is_active,
            metadata_json=payload.metadata_json,
        )
        return self.repository.create(template)

    def update_template(
        self,
        template_id: UUID,
        payload: NotificationTemplateUpdate,
    ) -> NotificationTemplate:
        template = self.get_template(template_id)

        for field, value in payload.model_dump(exclude_unset=True).items():
            if field == "name" and isinstance(value, str):
                value = value.strip()
            setattr(template, field, value)

        return self.repository.save(template)

    def delete_template(self, template_id: UUID) -> None:
        template = self.get_template(template_id)
        self.repository.delete(template)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.template_repository = NotificationTemplateRepository(db)
        self.event_repository = NotificationEventRepository(db)
        self.delivery_repository = NotificationDeliveryRepository(db)

    def create_event(
        self,
        payload: NotificationEventCreate,
        created_by_id: UUID | None = None,
    ) -> NotificationEvent:
        subject = payload.subject
        body = payload.body

        if payload.template_code:
            template = self.template_repository.find_by_code(payload.template_code)

            if not template or not template.is_active:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Active notification template not found",
                )

            subject = subject or self._render(template.subject_template, payload.payload_json or {})
            body = body or self._render(template.body_template, payload.payload_json or {})

        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notification body is required",
            )

        event = NotificationEvent(
            event_type=payload.event_type.strip().lower(),
            source_module=payload.source_module.strip().lower(),
            source_entity_type=payload.source_entity_type,
            source_entity_id=payload.source_entity_id,
            template_code=payload.template_code.strip().lower() if payload.template_code else None,
            payload_json=payload.payload_json,
            created_by_id=created_by_id,
        )
        self.event_repository.create(event)

        delivery = NotificationDelivery(
            event_id=event.id,
            recipient_user_id=payload.recipient_user_id,
            recipient_role_id=payload.recipient_role_id,
            channel=payload.channel,
            status=NotificationStatus.pending,
            subject=subject,
            body=body,
        )
        self.delivery_repository.create(delivery)

        self.db.commit()
        self.db.refresh(event)
        return event

    def list_user_deliveries(self, user_id: UUID) -> list[NotificationDelivery]:
        return self.delivery_repository.list_for_user(user_id)

    def process_pending(self) -> dict:
        deliveries = self.delivery_repository.list_pending()
        result = {"checked": len(deliveries), "sent": 0, "failed": 0}

        for delivery in deliveries:
            try:
                delivery.attempt_count += 1
                delivery.status = NotificationStatus.sent
                delivery.sent_at = datetime.utcnow()
                delivery.last_error = None
                result["sent"] += 1
            except Exception as exc:
                delivery.status = NotificationStatus.failed
                delivery.last_error = str(exc)
                result["failed"] += 1

        self.db.commit()
        return result

    def _render(self, template: str | None, payload: dict) -> str | None:
        if template is None:
            return None

        rendered = template

        for key, value in payload.items():
            rendered = rendered.replace("{{" + key + "}}", str(value))

        return rendered
