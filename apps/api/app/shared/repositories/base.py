from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    def __init__(self, db: Session, model: type[ModelType]):
        self.db = db
        self.model = model

    def get(self, id: UUID) -> ModelType | None:
        return self.db.get(self.model, id)

    def list(self, limit: int = 50, offset: int = 0) -> list[ModelType]:
        statement = select(self.model).limit(limit).offset(offset)
        return list(self.db.scalars(statement).all())

    def add(self, entity: ModelType) -> ModelType:
        self.db.add(entity)
        self.db.flush()
        self.db.refresh(entity)
        return entity

    def delete(self, entity: ModelType) -> None:
        self.db.delete(entity)
        self.db.flush()
