from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.tasks.router import resolve_task_outlet_access
from app.schemas.audit import AuditEventResponse, AuditEventsPage
from app.services.audit_trail import list_audit_events

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/events", response_model=AuditEventsPage)
def get_audit_events(
    outlet_id: int | None = Query(default=None),
    actor: str | None = Query(default=None),
    outlet_name: str | None = Query(default=None),
    category: str | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    scoped_outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    if outlet_id is not None and not full_access and (not outlet_ids or outlet_id not in outlet_ids):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet's audit events",
        )

    effective_outlet_id = outlet_id if outlet_id is not None else scoped_outlet_id

    rows, total = list_audit_events(
        db,
        outlet_id=effective_outlet_id,
        outlet_ids=None if effective_outlet_id else outlet_ids,
        all_outlets=full_access and effective_outlet_id is None,
        actor=actor,
        outlet_name=outlet_name,
        category=category,
        days=days,
        limit=limit,
        offset=offset,
    )

    return AuditEventsPage(
        total=total,
        items=[AuditEventResponse(**row) for row in rows],
    )
