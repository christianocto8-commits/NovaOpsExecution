from __future__ import annotations

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


class AnnouncementService:
    def __init__(self, db: Session):
        self.db = db

    def _resolve_legacy_outlet(self, identity_user: IdentityUser) -> Outlet | None:
        if not identity_user.outlet_id:
            return None

        identity_outlet = self.db.get(IdentityOutlet, identity_user.outlet_id)
        if not identity_outlet:
            return None

        code = identity_outlet.code.strip().upper()
        return self.db.query(Outlet).filter(Outlet.code == code).first()

    def _matches_scope(self, announcement: Announcement, identity_user: IdentityUser) -> bool:
        scope = announcement.target_scope or "all"
        target_ids = announcement.target_ids or []

        if scope == "all":
            return True

        legacy_outlet = self._resolve_legacy_outlet(identity_user)

        if scope == "outlet":
            if not target_ids:
                return True
            if legacy_outlet and str(legacy_outlet.id) in target_ids:
                return True
            if identity_user.outlet_id and str(identity_user.outlet_id) in target_ids:
                return True
            if legacy_outlet and legacy_outlet.code in target_ids:
                return True
            return False

        if not legacy_outlet:
            return False

        if scope == "region":
            if not target_ids:
                return True
            return bool(legacy_outlet.region and legacy_outlet.region in target_ids)

        if scope == "district":
            if not target_ids:
                return True
            return bool(legacy_outlet.district and legacy_outlet.district in target_ids)

        return False

    def _active_filter(self):
        now = datetime.now(timezone.utc)
        return or_(
            Announcement.published_at.isnot(None),
        ), now

    def list_all(self) -> list[Announcement]:
        return (
            self.db.query(Announcement)
            .order_by(Announcement.created_at.desc())
            .all()
        )

    def list_active_for_user(self, identity_user: IdentityUser) -> list[dict]:
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
        announcement = Announcement(
            title=payload.title.strip(),
            body=payload.body.strip(),
            priority=payload.priority,
            target_scope=payload.target_scope,
            target_ids=payload.target_ids,
            requires_acknowledgment=payload.requires_acknowledgment,
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

        announcement.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def delete(self, announcement_id: UUID) -> None:
        announcement = self.get(announcement_id)
        self.db.delete(announcement)
        self.db.commit()

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
        announcement.published_at = now
        announcement.updated_at = now
        self.db.commit()
        self.db.refresh(announcement)

        from app.core.database import SessionLocal
        from app.services.activity_events import record_activity_event

        legacy_db = SessionLocal()
        try:
            record_activity_event(
                legacy_db,
                action="announcement_published",
                summary=f"Pengumuman: {announcement.title}",
                actor_name=actor_name or "Admin",
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

        return announcement

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
