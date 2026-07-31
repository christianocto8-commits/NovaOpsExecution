from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.announcement import Announcement, AnnouncementRead
from app.models.outlet import Outlet
from app.modules.announcements.schemas import AnnouncementCreate, AnnouncementUpdate
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import User as IdentityUser
from app.modules.notifications.models import NotificationChannel, NotificationDelivery, NotificationEvent
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService


logger = logging.getLogger(__name__)


class AnnouncementService:
    def __init__(self, db: Session):
        self.db = db

    def _identity_outlets_for_user(self, identity_user: IdentityUser) -> list[IdentityOutlet]:
        role_slug = identity_user.role.slug if identity_user.role else ""
        if role_slug in {"owner", "admin"}:
            return self.db.query(IdentityOutlet).order_by(IdentityOutlet.code.asc()).all()

        outlets_by_id = {
            outlet.id: outlet
            for outlet in [
                *list(identity_user.assigned_outlets),
                *([identity_user.outlet] if identity_user.outlet else []),
            ]
        }
        if outlets_by_id:
            return list(outlets_by_id.values())

        if role_slug == "regional_manager" and identity_user.region_id:
            return (
                self.db.query(IdentityOutlet)
                .filter(IdentityOutlet.region_id == identity_user.region_id)
                .all()
            )
        if role_slug == "district_manager" and identity_user.district_id:
            return (
                self.db.query(IdentityOutlet)
                .filter(IdentityOutlet.district_id == identity_user.district_id)
                .all()
            )
        return []

    def _legacy_outlets(self, identity_outlets: list[IdentityOutlet]) -> list[Outlet]:
        codes = [outlet.code.strip().upper() for outlet in identity_outlets if outlet.code]
        if not codes:
            return []
        return self.db.query(Outlet).filter(Outlet.code.in_(codes)).all()

    @staticmethod
    def _target_matches(target_ids: set[str], aliases: set[str]) -> bool:
        return bool(target_ids.intersection(alias.lower() for alias in aliases if alias))

    def _matches_scope_values(
        self,
        *,
        scope: str,
        target_ids: list[str],
        identity_user: IdentityUser,
    ) -> bool:
        role_slug = identity_user.role.slug if identity_user.role else ""
        if scope == "all":
            return True
        if not target_ids:
            return False
        if role_slug in {"owner", "admin"}:
            return True

        normalized_targets = {str(target).strip().lower() for target in target_ids if str(target).strip()}
        identity_outlets = self._identity_outlets_for_user(identity_user)
        legacy_outlets = self._legacy_outlets(identity_outlets)

        if scope == "outlet":
            aliases: set[str] = set()
            for outlet in identity_outlets:
                aliases.update({str(outlet.id), outlet.code, outlet.name})
            for outlet in legacy_outlets:
                aliases.update({str(outlet.id), outlet.code, outlet.name})
            return self._target_matches(normalized_targets, aliases)

        if scope == "region":
            aliases = set()
            if identity_user.region_id:
                aliases.add(str(identity_user.region_id))
            for outlet in identity_outlets:
                if outlet.region_id:
                    aliases.add(str(outlet.region_id))
                if outlet.region:
                    aliases.update({outlet.region.code, outlet.region.name})
            for outlet in legacy_outlets:
                if outlet.region:
                    aliases.add(outlet.region)
            return self._target_matches(normalized_targets, aliases)

        if scope == "district":
            aliases = set()
            if identity_user.district_id:
                aliases.add(str(identity_user.district_id))
            for outlet in identity_outlets:
                if outlet.district_id:
                    aliases.add(str(outlet.district_id))
                if outlet.district:
                    aliases.update({outlet.district.code, outlet.district.name})
            for outlet in legacy_outlets:
                if outlet.district:
                    aliases.add(outlet.district)
            return self._target_matches(normalized_targets, aliases)

        return False

    def _matches_scope(self, announcement: Announcement, identity_user: IdentityUser) -> bool:
        return self._matches_scope_values(
            scope=announcement.target_scope or "all",
            target_ids=announcement.target_ids or [],
            identity_user=identity_user,
        )

    @staticmethod
    def _can_receive_notifications(identity_user: IdentityUser) -> bool:
        if not identity_user.is_active or not identity_user.role:
            return False
        return any(
            permission.code in {"notification.read", "notification.*"}
            for permission in identity_user.role.permissions
        )

    def list_recipients(self, scope: str, target_ids: list[str]) -> list[IdentityUser]:
        users = self.db.query(IdentityUser).filter(IdentityUser.is_active.is_(True)).all()
        return [
            user
            for user in users
            if self._can_receive_notifications(user)
            and self._matches_scope_values(
                scope=scope,
                target_ids=target_ids,
                identity_user=user,
            )
        ]

    def preview_recipients(self, scope: str, target_ids: list[str]) -> dict:
        recipients = self.list_recipients(scope, target_ids)
        normalized_targets = {
            str(target).strip().lower() for target in target_ids if str(target).strip()
        }
        outlets = self.db.query(IdentityOutlet).all()
        if scope == "outlet":
            outlets = [
                outlet
                for outlet in outlets
                if self._target_matches(
                    normalized_targets,
                    {str(outlet.id), outlet.code, outlet.name},
                )
            ]
        elif scope == "region":
            outlets = [
                outlet
                for outlet in outlets
                if self._target_matches(
                    normalized_targets,
                    {
                        str(outlet.region_id or ""),
                        outlet.region.code if outlet.region else "",
                        outlet.region.name if outlet.region else "",
                    },
                )
            ]
        elif scope == "district":
            outlets = [
                outlet
                for outlet in outlets
                if self._target_matches(
                    normalized_targets,
                    {
                        str(outlet.district_id or ""),
                        outlet.district.code if outlet.district else "",
                        outlet.district.name if outlet.district else "",
                    },
                )
            ]
        return {
            "recipient_count": len(recipients),
            "outlet_count": len(outlets),
            "recipients": [recipient.full_name for recipient in recipients[:8]],
        }

    def list_all(self) -> list[Announcement]:
        self.publish_due()
        return (
            self.db.query(Announcement)
            .order_by(Announcement.created_at.desc())
            .all()
        )

    def list_active_for_user(self, identity_user: IdentityUser) -> list[dict]:
        self.publish_due()
        now = datetime.now(timezone.utc)
        announcements = (
            self.db.query(Announcement)
            .filter(Announcement.published_at.isnot(None))
            .filter(or_(Announcement.expires_at.is_(None), Announcement.expires_at > now))
            .order_by(Announcement.published_at.desc())
            .all()
        )

        read_map = {
            row.announcement_id: row
            for row in self.db.query(AnnouncementRead)
            .filter(AnnouncementRead.user_id == identity_user.id)
            .all()
        }

        results: list[dict] = []
        for announcement in announcements:
            if not self._matches_scope(announcement, identity_user):
                continue

            read_row = read_map.get(announcement.id)
            results.append(
                {
                    "announcement": announcement,
                    "is_read": read_row is not None and read_row.read_at is not None,
                    "is_acknowledged": read_row is not None and read_row.acknowledged_at is not None,
                    "read_at": read_row.read_at if read_row else None,
                    "acknowledged_at": read_row.acknowledged_at if read_row else None,
                }
            )

        return results

    def get_unread_count(self, identity_user: IdentityUser) -> int:
        active = self.list_active_for_user(identity_user)
        return sum(1 for item in active if not item["is_read"])

    def get(self, announcement_id: UUID) -> Announcement:
        announcement = self.db.get(Announcement, announcement_id)
        if not announcement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
        return announcement

    def create(self, payload: AnnouncementCreate, created_by_id: UUID) -> Announcement:
        if payload.target_scope != "all" and not payload.target_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A scoped announcement requires at least one target",
            )
        if payload.scheduled_at and payload.expires_at and payload.expires_at <= payload.scheduled_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Announcement expiry must be after its publish schedule",
            )
        announcement = Announcement(
            title=payload.title.strip(),
            body=payload.body.strip(),
            priority=payload.priority,
            target_scope=payload.target_scope,
            target_ids=payload.target_ids,
            requires_acknowledgment=payload.requires_acknowledgment,
            scheduled_at=payload.scheduled_at,
            expires_at=payload.expires_at,
            created_by_id=created_by_id,
        )
        self.db.add(announcement)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def update(self, announcement_id: UUID, payload: AnnouncementUpdate) -> Announcement:
        announcement = self.get(announcement_id)
        data = payload.model_dump(exclude_unset=True)

        for key, value in data.items():
            if key == "title" and isinstance(value, str):
                value = value.strip()
            if key == "body" and isinstance(value, str):
                value = value.strip()
            setattr(announcement, key, value)

        if announcement.target_scope != "all" and not announcement.target_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A scoped announcement requires at least one target",
            )
        if (
            announcement.scheduled_at
            and announcement.expires_at
            and announcement.expires_at <= announcement.scheduled_at
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Announcement expiry must be after its publish schedule",
            )

        announcement.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def delete(self, announcement_id: UUID) -> None:
        announcement = self.get(announcement_id)
        self.db.delete(announcement)
        self.db.commit()

    def _notification_already_exists(self, announcement_id: UUID, user_id: UUID) -> bool:
        return (
            self.db.query(NotificationDelivery.id)
            .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
            .filter(
                NotificationEvent.event_type == "announcement_published",
                NotificationEvent.source_entity_id == str(announcement_id),
                NotificationDelivery.recipient_user_id == user_id,
            )
            .first()
            is not None
        )

    def _deliver(self, announcement: Announcement) -> None:
        recipients = self.list_recipients(
            announcement.target_scope or "all",
            announcement.target_ids or [],
        )
        payload = {
            "announcement_id": str(announcement.id),
            "event_type": "announcement_published",
            "priority": announcement.priority,
            "requires_acknowledgment": announcement.requires_acknowledgment,
            "action_url": f"/dashboard/announcements?id={announcement.id}",
        }
        for recipient in recipients:
            if self._notification_already_exists(announcement.id, recipient.id):
                continue
            try:
                NotificationService(self.db).create_event(
                    NotificationEventCreate(
                        event_type="announcement_published",
                        source_module="announcements",
                        source_entity_type="announcement",
                        source_entity_id=str(announcement.id),
                        recipient_user_id=recipient.id,
                        channel=NotificationChannel.in_app,
                        subject=announcement.title,
                        body=announcement.body,
                        payload_json=payload,
                    ),
                    created_by_id=announcement.created_by_id,
                )
                PushNotificationService(self.db).send_to_user(
                    recipient.id,
                    title=announcement.title,
                    body=announcement.body,
                    url=payload["action_url"],
                    data=payload,
                )
            except Exception:
                self.db.rollback()
                logger.exception(
                    "Failed to deliver announcement %s to user %s",
                    announcement.id,
                    recipient.id,
                )

    def _record_publish_activity(
        self,
        announcement: Announcement,
        *,
        actor_name: str,
    ) -> None:
        from app.core.database import SessionLocal
        from app.services.activity_events import record_activity_event

        legacy_db = SessionLocal()
        try:
            record_activity_event(
                legacy_db,
                action="announcement_published",
                summary=f"Pengumuman: {announcement.title}",
                actor_name=actor_name,
                resource_type="announcement",
                resource_id=str(announcement.id),
                metadata={
                    "title": announcement.title,
                    "priority": announcement.priority,
                    "target_scope": announcement.target_scope,
                },
            )
        finally:
            legacy_db.close()

    def _publish_now(
        self,
        announcement: Announcement,
        *,
        actor_name: str,
    ) -> Announcement:
        now = datetime.now(timezone.utc)
        announcement.published_at = now
        announcement.updated_at = now
        self.db.commit()
        self.db.refresh(announcement)
        self._record_publish_activity(announcement, actor_name=actor_name)
        self._deliver(announcement)
        return announcement

    def publish(
        self,
        announcement_id: UUID,
        *,
        actor_name: str | None = None,
    ) -> Announcement:
        announcement = self.get(announcement_id)
        if announcement.published_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Announcement already published",
            )

        now = datetime.now(timezone.utc)
        if announcement.expires_at and announcement.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expired announcement cannot be published",
            )
        if announcement.scheduled_at and announcement.scheduled_at > now:
            announcement.updated_at = now
            self.db.commit()
            self.db.refresh(announcement)
            return announcement
        return self._publish_now(announcement, actor_name=actor_name or "Admin")

    def publish_due(self) -> int:
        now = datetime.now(timezone.utc)
        due = (
            self.db.query(Announcement)
            .filter(
                Announcement.published_at.is_(None),
                Announcement.scheduled_at.isnot(None),
                Announcement.scheduled_at <= now,
                or_(Announcement.expires_at.is_(None), Announcement.expires_at > now),
            )
            .with_for_update(skip_locked=True)
            .all()
        )
        for announcement in due:
            self._publish_now(announcement, actor_name="Scheduler")
        return len(due)

    def analytics(self, announcement_id: UUID) -> dict:
        announcement = self.get(announcement_id)
        recipients = self.list_recipients(
            announcement.target_scope or "all",
            announcement.target_ids or [],
        )
        notification_count = (
            self.db.query(NotificationDelivery.id)
            .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
            .filter(
                NotificationEvent.event_type == "announcement_published",
                NotificationEvent.source_entity_id == str(announcement_id),
            )
            .count()
        )
        reads = (
            self.db.query(AnnouncementRead)
            .filter(AnnouncementRead.announcement_id == announcement_id)
            .all()
        )
        read_count = sum(1 for row in reads if row.read_at is not None)
        acknowledged_count = sum(1 for row in reads if row.acknowledged_at is not None)
        return {
            "announcement_id": announcement_id,
            "recipient_count": len(recipients),
            "notification_count": notification_count,
            "read_count": read_count,
            "acknowledged_count": acknowledged_count,
            "pending_acknowledgment_count": (
                max(len(recipients) - acknowledged_count, 0)
                if announcement.requires_acknowledgment
                else 0
            ),
        }

    def mark_read(self, announcement_id: UUID, identity_user: IdentityUser) -> AnnouncementRead:
        announcement = self.get(announcement_id)
        if not self._matches_scope(announcement, identity_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not in target scope")

        now = datetime.now(timezone.utc)
        read_row = (
            self.db.query(AnnouncementRead)
            .filter(
                AnnouncementRead.announcement_id == announcement_id,
                AnnouncementRead.user_id == identity_user.id,
            )
            .first()
        )

        if read_row:
            if not read_row.read_at:
                read_row.read_at = now
        else:
            read_row = AnnouncementRead(
                announcement_id=announcement_id,
                user_id=identity_user.id,
                read_at=now,
            )
            self.db.add(read_row)

        self.db.commit()
        self.db.refresh(read_row)
        return read_row

    def acknowledge(self, announcement_id: UUID, identity_user: IdentityUser) -> AnnouncementRead:
        announcement = self.get(announcement_id)
        if not self._matches_scope(announcement, identity_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not in target scope")

        now = datetime.now(timezone.utc)
        read_row = (
            self.db.query(AnnouncementRead)
            .filter(
                AnnouncementRead.announcement_id == announcement_id,
                AnnouncementRead.user_id == identity_user.id,
            )
            .first()
        )

        if read_row:
            if not read_row.read_at:
                read_row.read_at = now
            read_row.acknowledged_at = now
        else:
            read_row = AnnouncementRead(
                announcement_id=announcement_id,
                user_id=identity_user.id,
                read_at=now,
                acknowledged_at=now,
            )
            self.db.add(read_row)

        self.db.commit()
        self.db.refresh(read_row)
        return read_row
