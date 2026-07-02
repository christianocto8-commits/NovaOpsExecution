from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.repositories.base_repository import BaseRepository


class ExecutionRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, ExecutionSession)