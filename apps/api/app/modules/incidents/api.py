from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.incidents.schemas import (
    FollowUpCreate,
    FollowUpRead,
    FollowUpUpdate,
    IncidentCreate,
    IncidentRead,
    IncidentSummary,
    IncidentUpdate,
)
from app.modules.incidents.service import FollowUpService, IncidentService

router = APIRouter(tags=["Incidents"])


@router.get("/incidents", response_model=list[IncidentRead])
def list_incidents(
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = None,
    outlet_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incident.read")),
):
    return IncidentService(db).list(
        user,
        status_filter=status_filter,
        severity=severity,
        outlet_id=outlet_id,
    )


@router.get("/incidents/summary", response_model=IncidentSummary)
def incident_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incident.read")),
):
    return IncidentService(db).summary(user)


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incident.read")),
):
    return IncidentService(db).get(user, incident_id)


@router.post("/incidents", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incident.create")),
):
    return IncidentService(db).create(user, payload)


@router.patch("/incidents/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: UUID,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incident.manage")),
):
    return IncidentService(db).update(user, incident_id, payload)


@router.get("/follow-ups", response_model=list[FollowUpRead])
def list_follow_ups(
    incident_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("followup.read")),
):
    return FollowUpService(db).list(user, incident_id=incident_id)


@router.post("/follow-ups", response_model=FollowUpRead, status_code=status.HTTP_201_CREATED)
def create_follow_up(
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("followup.create")),
):
    return FollowUpService(db).create(user, payload)


@router.patch("/follow-ups/{action_id}", response_model=FollowUpRead)
def update_follow_up(
    action_id: UUID,
    payload: FollowUpUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("followup.update")),
):
    return FollowUpService(db).update(user, action_id, payload)
