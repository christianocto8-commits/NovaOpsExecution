from sqlalchemy.orm import Session

from app.models.builder_document import BuilderDocument
from app.repositories.base_repository import BaseRepository


class BuilderRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, BuilderDocument)