from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import Outlet, Role, User
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OUTLET_ROLE, OWNER_ROLE
from app.modules.incidents.models import FollowUpAction, Incident
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService


SUPERVISOR_ROLES = {
    OWNER_ROLE,
    ADMIN_ROLE,
    "regional_manager",
    "district_manager",
    AREA_MANAGER_ROLE,
}


def _user_has_outlet_scope(user: User, outlet: Outlet) -> bool:
    role = user.role.slug if user.role else ""
    if role in {OWNER_ROLE, ADMIN_ROLE}:
        return True
    if role == "regional_manager":
        return bool(user.region_id and user.region_id == outlet.region_id)
    if role == "district_manager":
        return bool(user.district_id and user.district_id == outlet.district_id)
    return user.outlet_id == outlet.id or any(item.id == outlet.id for item in user.assigned_outlets)


def _send(
    db: Session,
    *,
    recipient_id: UUID,
    event_type: str,
    entity_type: str,
    entity_id: UUID,
    subject: str,
    body: str,
    url: str,
    payload: dict,
    created_by_id: UUID | None = None,
) -> None:
    NotificationService(db).create_event(
        NotificationEventCreate(
            event_type=event_type,
            source_module="incidents",
            source_entity_type=entity_type,
            source_entity_id=str(entity_id),
            recipient_user_id=recipient_id,
            channel=NotificationChannel.in_app,
            subject=subject,
            body=body,
            payload_json={**payload, "action_url": url},
        ),
        created_by_id=created_by_id,
    )
    PushNotificationService(db).send_to_user(
        recipient_id,
        title=subject,
        body=body,
        url=url,
        data=payload,
    )


def notify_incident_reported(db: Session, incident: Incident) -> None:
    outlet = db.get(Outlet, incident.outlet_id)
    if not outlet:
        return
    role_ids = list(
        db.scalars(select(Role.id).where(Role.slug.in_(SUPERVISOR_ROLES))).all()
    )
    if not role_ids:
        return
    recipients = db.scalars(
        select(User).where(User.is_active.is_(True), User.role_id.in_(role_ids))
    ).all()
    payload = {
        "incident_id": str(incident.id),
        "outlet_id": str(incident.outlet_id),
        "severity": incident.severity,
    }
    for recipient in recipients:
        if recipient.id == incident.reporter_id or not _user_has_outlet_scope(recipient, outlet):
            continue
        _send(
            db,
            recipient_id=recipient.id,
            event_type="incident_reported",
            entity_type="incident",
            entity_id=incident.id,
            subject=f"Incident {incident.severity}: {incident.title}",
            body=f"Incident baru dilaporkan di {outlet.name}.",
            url="/dashboard/incidents",
            payload=payload,
            created_by_id=incident.reporter_id,
        )


def notify_follow_up_assigned(db: Session, action: FollowUpAction) -> None:
    outlet = db.get(Outlet, action.outlet_id)
    outlet_name = outlet.name if outlet else "outlet"
    recipient_ids: set[UUID] = set()
    if action.assignee_id:
        recipient_ids.add(action.assignee_id)
    else:
        outlet_users = db.scalars(
            select(User)
            .join(Role, Role.id == User.role_id)
            .where(User.is_active.is_(True), Role.slug == OUTLET_ROLE)
        ).all()
        recipient_ids.update(
            user.id
            for user in outlet_users
            if user.outlet_id == action.outlet_id
            or any(item.id == action.outlet_id for item in user.assigned_outlets)
        )
    for recipient_id in recipient_ids - {action.created_by}:
        _send(
            db,
            recipient_id=recipient_id,
            event_type="follow_up_assigned",
            entity_type="follow_up",
            entity_id=action.id,
            subject=f"Follow-up baru: {action.title}",
            body=f"Anda mendapat follow-up action untuk {outlet_name}.",
            url="/dashboard/incidents",
            payload={
                "follow_up_id": str(action.id),
                "incident_id": str(action.incident_id) if action.incident_id else None,
                "outlet_id": str(action.outlet_id),
            },
            created_by_id=action.created_by,
        )


def notify_follow_up_completed(db: Session, action: FollowUpAction) -> None:
    if action.created_by == action.assignee_id:
        return
    _send(
        db,
        recipient_id=action.created_by,
        event_type="follow_up_completed",
        entity_type="follow_up",
        entity_id=action.id,
        subject=f"Follow-up selesai: {action.title}",
        body="Pelaksana telah menyelesaikan follow-up action.",
        url="/dashboard/incidents",
        payload={
            "follow_up_id": str(action.id),
            "incident_id": str(action.incident_id) if action.incident_id else None,
            "outlet_id": str(action.outlet_id),
        },
        created_by_id=action.assignee_id,
    )
