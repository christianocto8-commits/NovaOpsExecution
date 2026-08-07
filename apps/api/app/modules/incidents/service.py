from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.models import Outlet, User
from app.modules.identity.permissions import ADMIN_ROLE, OWNER_ROLE
from app.modules.incidents.models import FollowUpAction, Incident
from app.modules.incidents.notifications import (
    notify_follow_up_assigned,
    notify_follow_up_completed,
    notify_incident_reported,
)
from app.modules.incidents.schemas import (
    FollowUpCreate,
    FollowUpUpdate,
    IncidentCreate,
    IncidentSummary,
    IncidentUpdate,
)


def accessible_outlet_ids(db: Session, user: User) -> list[UUID] | None:
    role = user.role.slug if user.role else ""
    if role in {OWNER_ROLE, ADMIN_ROLE}:
        return None
    if role == "regional_manager" and user.region_id:
        return list(db.scalars(select(Outlet.id).where(Outlet.region_id == user.region_id)).all())
    if role == "district_manager" and user.district_id:
        return list(db.scalars(select(Outlet.id).where(Outlet.district_id == user.district_id)).all())
    ids = {outlet.id for outlet in user.assigned_outlets}
    if user.outlet_id:
        ids.add(user.outlet_id)
    return list(ids)


def ensure_outlet_access(db: Session, user: User, outlet_id: UUID) -> None:
    allowed = accessible_outlet_ids(db, user)
    if allowed is not None and outlet_id not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Outlet is outside your scope")


class IncidentService:
    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        user: User,
        *,
        status_filter: str | None = None,
        severity: str | None = None,
        outlet_id: UUID | None = None,
    ) -> list[Incident]:
        statement = select(Incident).options(selectinload(Incident.follow_ups))
        allowed = accessible_outlet_ids(self.db, user)
        if allowed is not None:
            if allowed:
                statement = statement.where(Incident.outlet_id.in_(allowed))
        if outlet_id:
            ensure_outlet_access(self.db, user, outlet_id)
            statement = statement.where(Incident.outlet_id == outlet_id)
        if status_filter:
            statement = statement.where(Incident.status == status_filter)
        if severity:
            statement = statement.where(Incident.severity == severity)
        return list(self.db.scalars(statement.order_by(Incident.created_at.desc())).unique().all())

    def get(self, user: User, incident_id: UUID) -> Incident:
        incident = self.db.scalar(
            select(Incident)
            .options(selectinload(Incident.follow_ups))
            .where(Incident.id == incident_id)
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        ensure_outlet_access(self.db, user, incident.outlet_id)
        return incident

    def create(self, user: User, payload: IncidentCreate) -> Incident:
        ensure_outlet_access(self.db, user, payload.outlet_id)
        incident = Incident(**payload.model_dump(), reporter_id=user.id)
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        notify_incident_reported(self.db, incident)
        return self.get(user, incident.id)

    def update(self, user: User, incident_id: UUID, payload: IncidentUpdate) -> Incident:
        incident = self.get(user, incident_id)
        values = payload.model_dump(exclude_unset=True)
        previous_status = incident.status
        for key, value in values.items():
            setattr(incident, key, value)
        now = datetime.now(UTC)
        if incident.status == "resolved" and previous_status != "resolved":
            incident.resolved_at = now
        if incident.status == "closed" and previous_status != "closed":
            if not incident.resolution:
                raise HTTPException(status_code=400, detail="Resolution is required before closing")
            incident.closed_at = now
        self.db.add(incident)
        self.db.commit()
        return self.get(user, incident.id)

    def summary(self, user: User) -> IncidentSummary:
        incidents = self.list(user)
        now = datetime.now(UTC)
        open_rows = [item for item in incidents if item.status not in {"resolved", "closed"}]
        return IncidentSummary(
            total=len(incidents),
            open=len(open_rows),
            critical_open=sum(1 for item in open_rows if item.severity == "critical"),
            overdue=sum(1 for item in open_rows if item.due_at and item.due_at < now),
            resolved=sum(1 for item in incidents if item.status in {"resolved", "closed"}),
        )


class FollowUpService:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user: User, *, incident_id: UUID | None = None) -> list[FollowUpAction]:
        statement = select(FollowUpAction)
        allowed = accessible_outlet_ids(self.db, user)
        if allowed is not None:
            statement = statement.where(
                or_(
                    FollowUpAction.outlet_id.in_(allowed) if allowed else FollowUpAction.id.is_(None),
                    FollowUpAction.assignee_id == user.id,
                )
            )
        if incident_id:
            statement = statement.where(FollowUpAction.incident_id == incident_id)
        return list(self.db.scalars(statement.order_by(FollowUpAction.created_at.desc())).all())

    def get(self, user: User, action_id: UUID) -> FollowUpAction:
        action = self.db.get(FollowUpAction, action_id)
        if not action:
            raise HTTPException(status_code=404, detail="Follow-up action not found")
        if action.assignee_id != user.id:
            ensure_outlet_access(self.db, user, action.outlet_id)
        return action

    def create(self, user: User, payload: FollowUpCreate) -> FollowUpAction:
        ensure_outlet_access(self.db, user, payload.outlet_id)
        if payload.incident_id:
            incident = IncidentService(self.db).get(user, payload.incident_id)
            if incident.outlet_id != payload.outlet_id:
                raise HTTPException(status_code=400, detail="Follow-up outlet must match incident outlet")
        action = FollowUpAction(**payload.model_dump(), created_by=user.id)
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        notify_follow_up_assigned(self.db, action)
        return action

    def update(self, user: User, action_id: UUID, payload: FollowUpUpdate) -> FollowUpAction:
        action = self.get(user, action_id)
        previous_status = action.status
        role = user.role.slug if user.role else ""
        can_manage = role in {
            OWNER_ROLE,
            ADMIN_ROLE,
            "regional_manager",
            "district_manager",
            "area_manager",
        }
        if not can_manage and action.assignee_id not in {None, user.id}:
            raise HTTPException(status_code=403, detail="Only the assignee can update this follow-up")
        values = payload.model_dump(exclude_unset=True)
        if not can_manage:
            values = {
                key: value
                for key, value in values.items()
                if key in {"status", "completion_note", "evidence_urls"}
            }
        for key, value in values.items():
            setattr(action, key, value)
        if action.status == "completed" and not action.completed_at:
            action.completed_at = datetime.now(UTC)
        elif action.status != "completed":
            action.completed_at = None
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        if action.status == "completed" and previous_status != "completed":
            notify_follow_up_completed(self.db, action)
        return action
