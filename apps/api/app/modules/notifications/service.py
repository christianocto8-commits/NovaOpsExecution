from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import User as IdentityUser
from app.modules.notifications.models import (
    NotificationChannel,
    NotificationDelivery,
    NotificationEvent,
    NotificationStatus,
    NotificationTemplate,
)
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.repository import (
    NotificationDeliveryRepository,
    NotificationEventRepository,
    NotificationTemplateRepository,
)
from app.modules.notifications.schemas import (
    NotificationDeliveryRead,
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

        now = datetime.now(timezone.utc)
        is_in_app = payload.channel == NotificationChannel.in_app

        recipient_user_ids = [payload.recipient_user_id] if payload.recipient_user_id else []
        if payload.recipient_role_id and not recipient_user_ids:
            recipient_user_ids = list(
                self.db.scalars(
                    select(IdentityUser.id).where(
                        IdentityUser.role_id == payload.recipient_role_id,
                        IdentityUser.is_active.is_(True),
                    )
                ).all()
            )
        if not recipient_user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notification recipient is required",
            )

        for recipient_user_id in recipient_user_ids:
            delivery = NotificationDelivery(
                event_id=event.id,
                recipient_user_id=recipient_user_id,
                recipient_role_id=payload.recipient_role_id,
                channel=payload.channel,
                status=NotificationStatus.sent if is_in_app else NotificationStatus.pending,
                subject=subject,
                body=body,
                sent_at=now if is_in_app else None,
            )
            self.delivery_repository.create(delivery)

        self.db.commit()
        self.db.refresh(event)
        return event

    def list_user_deliveries(self, user_id: UUID) -> list[NotificationDelivery]:
        return self.delivery_repository.list_for_user(user_id)

    def resolve_delivery_url(self, delivery: NotificationDelivery) -> str:
        return self._resolve_delivery_url(delivery)

    def list_user_delivery_reads(self, user_id: UUID) -> list[NotificationDeliveryRead]:
        deliveries = self.list_user_deliveries(user_id)

        return [
            NotificationDeliveryRead.model_validate(delivery).model_copy(
                update={"action_url": self._resolve_delivery_url(delivery)}
            )
            for delivery in deliveries
        ]

    def get_unread_count(self, user_id: UUID) -> int:
        return self.delivery_repository.count_unread_for_user(user_id)

    def mark_read(self, delivery_id: UUID, user_id: UUID) -> NotificationDelivery:
        delivery = self.delivery_repository.get_by_id_for_user(delivery_id, user_id)

        if not delivery:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification delivery not found",
            )

        return self.delivery_repository.mark_read(delivery, datetime.now(timezone.utc))

    def mark_all_read(self, user_id: UUID, delivery_ids: list[UUID] | None = None) -> int:
        now = datetime.now(timezone.utc)

        if not delivery_ids:
            return self.delivery_repository.mark_all_read_for_user(user_id, now)

        marked = 0
        for delivery_id in delivery_ids:
            delivery = self.delivery_repository.get_by_id_for_user(delivery_id, user_id)
            if delivery and delivery.read_at is None:
                self.delivery_repository.mark_read(delivery, now)
                marked += 1

        return marked

    def process_pending(self) -> dict:
        deliveries = self.delivery_repository.list_pending()
        push_service = PushNotificationService(self.db)
        result = {"checked": len(deliveries), "sent": 0, "failed": 0}

        for delivery in deliveries:
            delivery.attempt_count += 1

            try:
                if delivery.channel == NotificationChannel.in_app:
                    delivery.status = NotificationStatus.sent
                    delivery.sent_at = datetime.now(timezone.utc)
                    delivery.last_error = None
                    result["sent"] += 1
                elif delivery.channel == NotificationChannel.push:
                    if not delivery.recipient_user_id:
                        raise ValueError("Push delivery missing recipient_user_id")

                    push_result = push_service.send_to_user(
                        delivery.recipient_user_id,
                        title=delivery.subject or "NovaOps",
                        body=delivery.body,
                        url=self._resolve_delivery_url(delivery),
                        data=self._delivery_payload(delivery),
                    )

                    if push_result["sent"] == 0 and push_result["attempted"] > 0:
                        raise ValueError("All push delivery attempts failed")
                elif delivery.channel == NotificationChannel.email:
                    if not delivery.recipient_user_id:
                        raise ValueError("Email delivery missing recipient_user_id")

                    from app.services.email_service import EmailService

                    recipient = self.db.get(IdentityUser, delivery.recipient_user_id)
                    if not recipient or not recipient.email:
                        raise ValueError("Email delivery missing recipient email")

                    if not EmailService().send(
                        recipient.email,
                        delivery.subject or "NovaOps",
                        delivery.body,
                    ):
                        raise ValueError("Email delivery failed or SMTP not configured")

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

    def _delivery_payload(self, delivery: NotificationDelivery) -> dict | None:
        event = self.db.get(NotificationEvent, delivery.event_id)
        return event.payload_json if event else None

    def _resolve_delivery_url(self, delivery: NotificationDelivery) -> str:
        payload = self._delivery_payload(delivery)

        if isinstance(payload, dict):
            action_url = payload.get("action_url")
            if isinstance(action_url, str) and action_url.startswith("/dashboard/"):
                return action_url
            event_type = str(payload.get("event_type") or "").lower()
            task_id = payload.get("task_id")

            if "corrective" in event_type or "capa" in event_type:
                return "/dashboard/corrective-actions"

            if event_type == "task_schedule_upcoming":
                return "/dashboard/tasks"

            if event_type == "form_submitted":
                return "/dashboard/history"

            if task_id is not None:
                return f"/dashboard/tasks?taskId={task_id}"

        return "/dashboard/notifications"

    def _render(self, template: str | None, payload: dict) -> str | None:
        if template is None:
            return None

        rendered = template

        for key, value in payload.items():
            rendered = rendered.replace("{{" + key + "}}", str(value))

        return rendered
