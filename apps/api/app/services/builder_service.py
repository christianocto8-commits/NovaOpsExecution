from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.runtime_template import RuntimeTemplate
from app.repositories.builder_repository import BuilderRepository


class BuilderService:
    def __init__(self, db: Session):
        self.repository = BuilderRepository(db)
        self.db = db

    def create(self, data: dict):
        return self.repository.create(data)

    def get_all(self):
        return self.repository.get_all()

    def get_by_id(self, builder_document_id: int):
        builder_document = self.repository.get_by_id(builder_document_id)

        if not builder_document:
            raise NotFoundException("Builder document not found")

        return builder_document

    def publish(self, builder_document_id: int):
        builder_document = self.get_by_id(builder_document_id)

        builder_document.status = "published"

        runtime_template = RuntimeTemplate(
            builder_document_id=builder_document.id,
            title=builder_document.title,
            description=builder_document.description,
            version=builder_document.version,
            status="active",
            runtime_json=builder_document.document_json,
        )

        self.db.add(runtime_template)
        self.db.commit()
        self.db.refresh(builder_document)

        return builder_document