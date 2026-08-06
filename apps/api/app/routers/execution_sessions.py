from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.models.user import User
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, OWNER_ROLE
from app.modules.tasks.router import resolve_task_outlet_access
from app.schemas.execution_session import (
    ExecutionSessionCreate,
    ExecutionSessionResponse,
    ExecutionSessionUpdate,
)

router = APIRouter(prefix="/execution-sessions", tags=["Execution Sessions"])


def _reject_overdue_task(db: Session, task_id: int | None) -> None:
    if task_id is None:
        return
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None or task.due_date is None:
        return
    due_date = task.due_date
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    if due_date < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task sudah overdue dan tidak bisa dikerjakan.",
        )


def _is_admin(db: Session, current_user: User) -> bool:
    identity_user = (
        db.query(IdentityUser)
        .filter(IdentityUser.email == current_user.email)
        .first()
    )
    role_slug = identity_user.role.slug if identity_user and identity_user.role else ""
    return role_slug in {OWNER_ROLE, ADMIN_ROLE}


def _ensure_session_access(
    db: Session,
    current_user: User,
    execution_session: ExecutionSession,
    *,
    allow_admin: bool = True,
) -> None:
    if allow_admin and _is_admin(db, current_user):
        return
    if execution_session.submitted_by == current_user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Execution session is outside your access scope",
    )


@router.post("", response_model=ExecutionSessionResponse)
def create_execution_session(
    payload: ExecutionSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    values = payload.model_dump()
    values["submitted_by"] = current_user.id
    _reject_overdue_task(db, payload.task_id)
    if payload.task_id is not None:
        resolve_task_outlet_access(db, current_user, None, task_id=payload.task_id)
    execution_session = ExecutionSession(**values)

    db.add(execution_session)
    db.commit()
    db.refresh(execution_session)

    return execution_session


@router.get("", response_model=list[ExecutionSessionResponse])
def get_execution_sessions(
    task_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    source_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ExecutionSession)

    if not _is_admin(db, current_user):
        _outlet_id, _actor_id, outlet_ids, _full_access = resolve_task_outlet_access(
            db, current_user, None
        )
        query = query.outerjoin(Task, ExecutionSession.task_id == Task.id).filter(
            or_(
                ExecutionSession.submitted_by == current_user.id,
                Task.outlet_id.in_(outlet_ids) if outlet_ids else Task.id == -1,
            )
        )

    if task_id is not None:
        query = query.filter(ExecutionSession.task_id == task_id)

    if status_filter:
        query = query.filter(ExecutionSession.status == status_filter)

    if source_type:
        query = query.filter(ExecutionSession.source_type == source_type)

    return query.order_by(ExecutionSession.id.desc()).all()


@router.patch("/{session_id}", response_model=ExecutionSessionResponse)
def update_execution_session(
    session_id: int,
    payload: ExecutionSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution_session = db.query(ExecutionSession).filter(ExecutionSession.id == session_id).first()

    if execution_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution session not found")

    _ensure_session_access(db, current_user, execution_session)
    updates = payload.model_dump(exclude_unset=True)
    updates.pop("submitted_by", None)
    if "task_id" in updates and updates["task_id"] is not None:
        _reject_overdue_task(db, updates["task_id"])
        resolve_task_outlet_access(db, current_user, None, task_id=updates["task_id"])
    for key, value in updates.items():
        setattr(execution_session, key, value)

    db.commit()
    db.refresh(execution_session)

    return execution_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_execution_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution_session = db.query(ExecutionSession).filter(ExecutionSession.id == session_id).first()

    if execution_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution session not found")

    _ensure_session_access(db, current_user, execution_session)
    db.delete(execution_session)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
