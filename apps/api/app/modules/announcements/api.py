from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.announcements.schemas import (
    AnnouncementAcknowledgeResponse,
    AnnouncementAnalytics,
    AnnouncementCreate,
    AnnouncementRead,
    AnnouncementRecipientPreview,
    AnnouncementRecipientPreviewRequest,
    AnnouncementUpdate,
    UnreadCountResponse,
)
from app.modules.announcements.service import AnnouncementService
from app.modules.identity.dependencies import get_current_user, require_permission
from app.modules.identity.models import User as IdentityUser
router = APIRouter(prefix="/announcements", tags=["Announcements"])


def _to_read(item: dict) -> AnnouncementRead:
    announcement = item["announcement"]
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        priority=announcement.priority,
        target_scope=announcement.target_scope,
        target_ids=announcement.target_ids or [],
        requires_acknowledgment=announcement.requires_acknowledgment,
        scheduled_at=announcement.scheduled_at,
        published_at=announcement.published_at,
        expires_at=announcement.expires_at,
        created_by_id=announcement.created_by_id,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        is_read=item["is_read"],
        is_acknowledged=item["is_acknowledged"],
        read_at=item["read_at"],
        acknowledged_at=item["acknowledged_at"],
    )


@router.get(
    "",
    response_model=list[AnnouncementRead],
    dependencies=[Depends(require_permission("notification.manage"))],
)
def list_announcements(db: Session = Depends(get_db)):
    service = AnnouncementService(db)
    announcements = service.list_all()
    return [
        AnnouncementRead(
            id=item.id,
            title=item.title,
            body=item.body,
            priority=item.priority,
            target_scope=item.target_scope,
            target_ids=item.target_ids or [],
            requires_acknowledgment=item.requires_acknowledgment,
            scheduled_at=item.scheduled_at,
            published_at=item.published_at,
            expires_at=item.expires_at,
            created_by_id=item.created_by_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in announcements
    ]


@router.post(
    "",
    response_model=AnnouncementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.manage")),
):
    announcement = AnnouncementService(db).create(payload, current_user.id)
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        priority=announcement.priority,
        target_scope=announcement.target_scope,
        target_ids=announcement.target_ids or [],
        requires_acknowledgment=announcement.requires_acknowledgment,
        scheduled_at=announcement.scheduled_at,
        published_at=announcement.published_at,
        expires_at=announcement.expires_at,
        created_by_id=announcement.created_by_id,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
    )


@router.post("/preview", response_model=AnnouncementRecipientPreview)
def preview_announcement_recipients(
    payload: AnnouncementRecipientPreviewRequest,
    db: Session = Depends(get_db),
    _: IdentityUser = Depends(require_permission("notification.manage")),
):
    return AnnouncementRecipientPreview(
        **AnnouncementService(db).preview_recipients(
            payload.target_scope,
            payload.target_ids,
        )
    )


@router.put(
    "/{announcement_id}",
    response_model=AnnouncementRead,
)
def update_announcement(
    announcement_id: UUID,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _: IdentityUser = Depends(require_permission("notification.manage")),
):
    announcement = AnnouncementService(db).update(announcement_id, payload)
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        priority=announcement.priority,
        target_scope=announcement.target_scope,
        target_ids=announcement.target_ids or [],
        requires_acknowledgment=announcement.requires_acknowledgment,
        scheduled_at=announcement.scheduled_at,
        published_at=announcement.published_at,
        expires_at=announcement.expires_at,
        created_by_id=announcement.created_by_id,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
    )


@router.delete(
    "/{announcement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    _: IdentityUser = Depends(require_permission("notification.manage")),
):
    AnnouncementService(db).delete(announcement_id)


@router.post(
    "/{announcement_id}/publish",
    response_model=AnnouncementRead,
)
def publish_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.manage")),
):
    announcement = AnnouncementService(db).publish(
        announcement_id,
        actor_name=current_user.full_name,
    )
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        priority=announcement.priority,
        target_scope=announcement.target_scope,
        target_ids=announcement.target_ids or [],
        requires_acknowledgment=announcement.requires_acknowledgment,
        scheduled_at=announcement.scheduled_at,
        published_at=announcement.published_at,
        expires_at=announcement.expires_at,
        created_by_id=announcement.created_by_id,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
    )


@router.get("/{announcement_id}/analytics", response_model=AnnouncementAnalytics)
def get_announcement_analytics(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    _: IdentityUser = Depends(require_permission("notification.manage")),
):
    return AnnouncementAnalytics(**AnnouncementService(db).analytics(announcement_id))


@router.get("/active", response_model=list[AnnouncementRead])
def list_active_announcements(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.read")),
):
    items = AnnouncementService(db).list_active_for_user(current_user)
    return [_to_read(item) for item in items]


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.read")),
):
    count = AnnouncementService(db).get_unread_count(current_user)
    return UnreadCountResponse(unread_count=count)


@router.post("/{announcement_id}/read", response_model=AnnouncementAcknowledgeResponse)
def mark_announcement_read(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.read")),
):
    read_row = AnnouncementService(db).mark_read(announcement_id, current_user)
    return AnnouncementAcknowledgeResponse(
        message="Marked as read",
        announcement_id=announcement_id,
        read_at=read_row.read_at,
        acknowledged_at=read_row.acknowledged_at,
    )


@router.post("/{announcement_id}/acknowledge", response_model=AnnouncementAcknowledgeResponse)
def acknowledge_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("notification.read")),
):
    read_row = AnnouncementService(db).acknowledge(announcement_id, current_user)
    return AnnouncementAcknowledgeResponse(
        message="Acknowledged",
        announcement_id=announcement_id,
        read_at=read_row.read_at,
        acknowledged_at=read_row.acknowledged_at,
    )
