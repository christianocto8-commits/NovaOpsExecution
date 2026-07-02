from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.repositories.runtime_repository import RuntimeRepository


class RuntimeService:
    def __init__(self, db: Session):
        self.repository = RuntimeRepository(db)

    def get_all(self):
        return self.repository.get_all()

    def get_by_id(self, runtime_template_id: int):
        runtime_template = self.repository.get_by_id(runtime_template_id)

        if not runtime_template:
            raise NotFoundException("Runtime template not found")

        return runtime_template