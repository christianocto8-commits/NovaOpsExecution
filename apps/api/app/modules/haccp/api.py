from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.haccp.schemas import (
    HACCP_CCPS,
    HaccpLogCreate,
    HaccpLogRead,
    HaccpLogSummary,
    HaccpLogUpdate,
)
from app.modules.haccp.service import HaccpLogService
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User

router = APIRouter(prefix="/haccp", tags=["HACCP"])


@router.get("/ccps", response_model=dict)
def list_ccps():
    return {"ccps": sorted(HACCP_CCPS)}


@router.get("/entries", response_model=list[HaccpLogRead])
def list_entries(
    outlet_id: UUID | None = None,
    ccp_name: str | None = None,
    passed: bool | None = Query(default=None),
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return HaccpLogService(db).list(
        user,
        outlet_id=outlet_id,
        ccp_name=ccp_name,
        passed=passed,
        limit=limit,
    )


@router.get("/entries/summary", response_model=HaccpLogSummary)
def entry_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return HaccpLogService(db).summary(user)


@router.get("/entries/by-outlet", response_model=list[dict])
def entries_by_outlet(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return HaccpLogService(db).counts_by_outlet(user)


@router.post(
    "/entries",
    response_model=HaccpLogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(
    payload: HaccpLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    return HaccpLogService(db).create(user, payload)


@router.patch("/entries/{entry_id}", response_model=HaccpLogRead)
def update_entry(
    entry_id: UUID,
    payload: HaccpLogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    return HaccpLogService(db).update(user, entry_id, payload)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    HaccpLogService(db).delete(user, entry_id)
