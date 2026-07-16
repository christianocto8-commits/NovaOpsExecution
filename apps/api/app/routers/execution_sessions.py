from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.execution_session import ExecutionSession
from app.schemas.execution_session import (
    ExecutionSessionCreate,
    ExecutionSessionResponse,
    ExecutionSessionUpdate,
)

router = APIRouter(prefix="/execution-sessions", tags=["Execution Sessions"])


@router.post("", response_model=ExecutionSessionResponse)
def create_execution_session(
    payload: ExecutionSessionCreate,
    db: Session = Depends(get_db),
):
    execution_session = ExecutionSession(**payload.model_dump())

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
):
    query = db.query(ExecutionSession)

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
):
    execution_session = db.query(ExecutionSession).filter(ExecutionSession.id == session_id).first()

    if execution_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution session not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(execution_session, key, value)

    db.commit()
    db.refresh(execution_session)

    return execution_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_execution_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    execution_session = db.query(ExecutionSession).filter(ExecutionSession.id == session_id).first()

    if execution_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution session not found")

    db.delete(execution_session)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
