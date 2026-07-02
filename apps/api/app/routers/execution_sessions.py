from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.execution_session import ExecutionSession
from app.schemas.execution_session import (
    ExecutionSessionCreate,
    ExecutionSessionResponse,
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
def get_execution_sessions(db: Session = Depends(get_db)):
    return db.query(ExecutionSession).order_by(ExecutionSession.id.desc()).all()