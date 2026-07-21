from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.tasks.router import resolve_task_outlet_access
from app.schemas.activity import ActivityFeedItem, ActivityFeedPage
from app.services.activity_feed import list_activity_feed

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/feed", response_model=ActivityFeedPage)
def get_activity_feed(
    outlet_id: int | None = Query(default=None),
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

    effective_outlet_id = outlet_id if outlet_id is not None else scoped_outlet_id

    rows, total = list_activity_feed(
        db,
        outlet_id=effective_outlet_id,
        outlet_ids=None if effective_outlet_id else outlet_ids,
        all_outlets=full_access and effective_outlet_id is None,
        days=days,
        limit=limit,
        offset=offset,
    )

    return ActivityFeedPage(
        total=total,
        items=[ActivityFeedItem(**row) for row in rows],
    )
