from sqlalchemy.orm import Session

from app.repositories.execution_repository import ExecutionRepository


class ExecutionService:
    def __init__(self, db: Session):
        self.repository = ExecutionRepository(db)

    def create(self, data: dict):
        return self.repository.create(data)

    def get_all(self):
        return self.repository.get_all()