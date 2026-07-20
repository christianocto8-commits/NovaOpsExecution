from uuid import UUID

import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Task
from app.modules.identity.models import User as IdentityUser
from app.modules.tasks.schemas import (
    OutletMemberResponse,
    TaskAssignmentCreate,
    TaskAssignmentResponse,
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskDetailResponse,
    TaskExecutionSubmit,
    TaskResponse,
    TaskExecutionSubmit,
    TaskReviewUpdate,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.modules.tasks.identity_bridge import (
    get_identity_user_by_email,
    get_identity_outlet,
    get_or_create_legacy_outlet,
    resolve_legacy_outlet_id,
    sync_identity_access,
    sync_legacy_user,
)
from app.modules.tasks.due_soon_alerts import process_due_soon_task_alerts
from app.modules.tasks.overdue_alerts import process_overdue_task_alerts
from app.modules.tasks.service import TaskService
from app.repositories.outlet_repository import OutletRepository

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def ensure_outlet_access(db: Session, user_id: int, outlet_id: int):
    repo = OutletRepository(db)
    membership = repo.get_user_outlet_role(user_id, outlet_id)

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet",
        )

    return membership


def get_task_outlet_id(db: Session, task_id: int) -> int:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return task.outlet_id


def resolve_task_outlet_access(
    db: Session,
    current_user,
    x_outlet_id: str | None,
    task_id: int | None = None,
) -> tuple[int | None, int, list[int] | None, bool]:
    actor_id = current_user.id

    if not x_outlet_id:
        identity_user = get_identity_user_by_email(db, current_user.email)

        if identity_user:
            legacy_user, outlet_ids, full_access = sync_identity_access(db, identity_user)
            db.commit()
            actor_id = legacy_user.id

            if task_id is not None:
                outlet_id = get_task_outlet_id(db, task_id)
                if full_access or outlet_id in outlet_ids:
                    return outlet_id, actor_id, outlet_ids, full_access

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User has no access to this task outlet",
                )

            if full_access:
                return None, actor_id, outlet_ids, True

            if len(outlet_ids) == 1:
                return outlet_ids[0], actor_id, outlet_ids, False

            return None, actor_id, outlet_ids, False

        if task_id is not None:
            outlet_id = get_task_outlet_id(db, task_id)
            ensure_outlet_access(db, actor_id, outlet_id)
            return outlet_id, actor_id, [outlet_id], False

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outlet context is required for this task action",
        )

    try:
        identity_outlet_id = UUID(x_outlet_id)
    except (TypeError, ValueError):
        identity_outlet_id = None

    if identity_outlet_id:
        identity_user = db.query(IdentityUser).filter(IdentityUser.email == current_user.email).first()
        identity_outlet = get_identity_outlet(db, identity_outlet_id)

        if identity_user and identity_outlet:
            legacy_outlet = get_or_create_legacy_outlet(db, identity_outlet)
            legacy_user = sync_legacy_user(db, identity_user, legacy_outlet)
            db.commit()
            actor_id = legacy_user.id
            outlet_id = legacy_outlet.id
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outlet is not connected to task engine",
            )
    else:
        try:
            outlet_id = resolve_legacy_outlet_id(db, x_outlet_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outlet is not connected to task engine",
            )

    ensure_outlet_access(db, actor_id, outlet_id)
    return outlet_id, actor_id, [outlet_id], False


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    source_type: str | None = Query(default=None),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )
    service = TaskService(db)
    return service.list_tasks(
        outlet_id=x_outlet_id,
        outlet_ids=None if x_outlet_id else outlet_ids,
        all_outlets=full_access and x_outlet_id is None,
        source_type=source_type,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )
    if x_outlet_id is None:
        if full_access or not outlet_ids or len(outlet_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select an outlet before creating a task",
            )
        x_outlet_id = outlet_ids[0]
    service = TaskService(db)
    return service.create_task(payload=payload, outlet_id=x_outlet_id, actor_id=actor_id)


@router.post("/process-overdue-alerts")
def process_overdue_alerts(
    db: Session = Depends(get_db),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
):
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )

    return process_overdue_task_alerts(db)


@router.post("/process-due-soon-alerts")
def process_due_soon_alerts(
    db: Session = Depends(get_db),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
):
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )

    return process_due_soon_task_alerts(db)


@router.get("/outlet-members", response_model=list[OutletMemberResponse])
def list_outlet_members(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )
    if x_outlet_id is None:
        if full_access or not outlet_ids or len(outlet_ids) != 1:
            return []
        x_outlet_id = outlet_ids[0]
    service = TaskService(db)

    members = service.list_outlet_members(outlet_id=x_outlet_id)

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "role_name": member.role.name if member.role else None,
        }
        for member in members
    ]


@router.get("/{task_id}", response_model=TaskDetailResponse)
def get_task(
    task_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, _actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.get_task(task_id=task_id, outlet_id=x_outlet_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.update_task(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
    )


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    identity_user = get_identity_user_by_email(db, current_user.email)
    return service.update_status(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
        actor_identity_id=identity_user.id if identity_user else None,
    )


@router.post("/{task_id}/submit-execution", response_model=TaskResponse)
def submit_task_execution(
    task_id: int,
    payload: TaskExecutionSubmit,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    identity_user = get_identity_user_by_email(db, current_user.email)
    return service.submit_execution(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
        actor_identity_id=identity_user.id if identity_user else None,
    )


@router.patch("/{task_id}/review", response_model=TaskResponse)
def review_task(
    task_id: int,
    payload: TaskReviewUpdate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.review_task(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
    )


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: int,
    payload: TaskCommentCreate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.add_comment(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
    )


@router.get("/{task_id}/assignments", response_model=list[TaskAssignmentResponse])
def list_task_assignments(
    task_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, _actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.list_assignments(task_id=task_id, outlet_id=x_outlet_id)


@router.post(
    "/{task_id}/assignments",
    response_model=TaskAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_task_user(
    task_id: int,
    payload: TaskAssignmentCreate,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    return service.assign_user(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        payload=payload,
    )


@router.delete("/{task_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task_assignment(
    task_id: int,
    assignment_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    service.remove_assignment(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=actor_id,
        assignment_id=assignment_id,
    )
    return None


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    x_outlet_id, _actor_id, _outlet_ids, _full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id, task_id=task_id
    )
    service = TaskService(db)
    service.delete_task(task_id=task_id, outlet_id=x_outlet_id)
    return None
