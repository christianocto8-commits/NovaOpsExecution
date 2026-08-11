from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.task_drafts.draft_schemas import (
    TaskDraftCreate,
    TaskDraftPublishResponse,
    TaskDraftResponse,
    TaskDraftUpdate,
)
from app.modules.task_drafts.draft_service import TaskDraftService
from app.modules.tasks.router import ensure_task_permission
from app.repositories.outlet_repository import OutletRepository

router = APIRouter(prefix="/task-drafts", tags=["Task Drafts"])


def parse_outlet_id_header(raw_header: str | None) -> int:
    if not raw_header:
        return 1
    try:
        return int(raw_header.split(",")[0].strip())
    except (ValueError, TypeError):
        return 1


def ensure_outlet_access(db: Session, user_id: int, outlet_id: int):
    repo = OutletRepository(db)
    membership = repo.get_user_outlet_role(user_id, outlet_id)

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet",
        )

    return membership


@router.get("", response_model=list[TaskDraftResponse])
def list_task_drafts(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    service = TaskDraftService(db)
    return service.list_drafts(outlet_id=outlet_id)


@router.post("", response_model=TaskDraftResponse, status_code=status.HTTP_201_CREATED)
def create_task_draft(
    payload: TaskDraftCreate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    service = TaskDraftService(db)
    return service.create_draft(
        payload=payload,
        outlet_id=outlet_id,
        actor_id=current_user.id,
    )


@router.get("/{draft_id}", response_model=TaskDraftResponse)
def get_task_draft(
    draft_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    service = TaskDraftService(db)
    return service.get_draft(draft_id=draft_id, outlet_id=outlet_id)


@router.patch("/{draft_id}", response_model=TaskDraftResponse)
def update_task_draft(
    draft_id: int,
    payload: TaskDraftUpdate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    service = TaskDraftService(db)
    return service.update_draft(
        draft_id=draft_id,
        outlet_id=outlet_id,
        payload=payload,
    )


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_draft(
    draft_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    service = TaskDraftService(db)
    service.delete_draft(draft_id=draft_id, outlet_id=outlet_id)
    return None


@router.post("/{draft_id}/publish", response_model=TaskDraftPublishResponse)
def publish_task_draft(
    draft_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    outlet_id = parse_outlet_id_header(x_outlet_id)
    ensure_outlet_access(db, current_user.id, outlet_id)
    ensure_task_permission(db, current_user, "task.create")
    service = TaskDraftService(db)

    task = service.publish_draft(
        draft_id=draft_id,
        outlet_id=outlet_id,
        actor_id=current_user.id,
    )

    return {
        "draft_id": draft_id,
        "task_id": task.id,
        "message": "Draft published successfully",
    }