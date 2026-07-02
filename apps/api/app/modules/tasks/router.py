from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.tasks.schemas import (
    OutletMemberResponse,
    TaskAssignmentCreate,
    TaskAssignmentResponse,
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskDetailResponse,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
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


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.list_tasks(outlet_id=x_outlet_id)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.create_task(payload=payload, outlet_id=x_outlet_id, actor_id=current_user.id)


@router.get("/outlet-members", response_model=list[OutletMemberResponse])
def list_outlet_members(
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
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
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.get_task(task_id=task_id, outlet_id=x_outlet_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.update_task(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=current_user.id,
        payload=payload,
    )


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.update_status(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=current_user.id,
        payload=payload,
    )


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: int,
    payload: TaskCommentCreate,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.add_comment(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=current_user.id,
        payload=payload,
    )


@router.get("/{task_id}/assignments", response_model=list[TaskAssignmentResponse])
def list_task_assignments(
    task_id: int,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
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
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    return service.assign_user(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=current_user.id,
        payload=payload,
    )


@router.delete("/{task_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task_assignment(
    task_id: int,
    assignment_id: int,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    service.remove_assignment(
        task_id=task_id,
        outlet_id=x_outlet_id,
        actor_id=current_user.id,
        assignment_id=assignment_id,
    )
    return None


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_access(db, current_user.id, x_outlet_id)
    service = TaskService(db)
    service.delete_task(task_id=task_id, outlet_id=x_outlet_id)
    return None