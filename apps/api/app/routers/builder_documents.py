from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.builder_document import BuilderDocument
from app.models.runtime_template import RuntimeTemplate
from app.modules.identity.dependencies import get_current_active_user, require_role
from app.modules.identity.models import User as IdentityUser
from app.schemas.builder_document import (
    BuilderDocumentCreate,
    BuilderDocumentResponse,
    BuilderDocumentUpdate,
)

router = APIRouter(prefix="/builder-documents", tags=["Builder Documents"])


@router.post("", response_model=BuilderDocumentResponse)
def create_builder_document(
    payload: BuilderDocumentCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    builder_document = BuilderDocument(**payload.model_dump())

    db.add(builder_document)
    db.commit()
    db.refresh(builder_document)

    return builder_document


@router.patch("/{builder_document_id}", response_model=BuilderDocumentResponse)
def update_builder_document(
    builder_document_id: int,
    payload: BuilderDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    builder_document = (
        db.query(BuilderDocument)
        .filter(BuilderDocument.id == builder_document_id)
        .first()
    )

    if not builder_document:
        raise HTTPException(status_code=404, detail="Builder document not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(builder_document, key, value)

    db.commit()
    db.refresh(builder_document)

    return builder_document


@router.get("", response_model=list[BuilderDocumentResponse])
def get_builder_documents(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    return db.query(BuilderDocument).order_by(BuilderDocument.id.desc()).all()


@router.get("/{builder_document_id}", response_model=BuilderDocumentResponse)
def get_builder_document(
    builder_document_id: int,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    builder_document = (
        db.query(BuilderDocument)
        .filter(BuilderDocument.id == builder_document_id)
        .first()
    )

    if not builder_document:
        raise HTTPException(status_code=404, detail="Builder document not found")

    return builder_document


@router.post("/{builder_document_id}/publish", response_model=BuilderDocumentResponse)
def publish_builder_document(
    builder_document_id: int,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user

    builder_document = (
        db.query(BuilderDocument)
        .filter(BuilderDocument.id == builder_document_id)
        .first()
    )

    if not builder_document:
        raise HTTPException(status_code=404, detail="Builder document not found")

    builder_document.status = "published"

    runtime_template = RuntimeTemplate(
        builder_document_id=builder_document.id,
        title=builder_document.title,
        description=builder_document.description,
        version=builder_document.version,
        status="active",
        runtime_json=builder_document.document_json,
    )

    db.add(runtime_template)
    db.commit()
    db.refresh(builder_document)

    return builder_document
