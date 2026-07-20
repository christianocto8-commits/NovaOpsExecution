from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.runtime_template import RuntimeTemplate
from app.modules.identity.dependencies import get_current_active_user
from app.modules.identity.models import User as IdentityUser
from app.schemas.runtime_template import RuntimeTemplateResponse

router = APIRouter(prefix="/runtime-templates", tags=["Runtime Templates"])


@router.get("", response_model=list[RuntimeTemplateResponse])
def get_runtime_templates(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    return db.query(RuntimeTemplate).order_by(RuntimeTemplate.id.desc()).all()


@router.get("/{runtime_template_id}", response_model=RuntimeTemplateResponse)
def get_runtime_template(
    runtime_template_id: int,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_active_user),
):
    del current_user

    runtime_template = (
        db.query(RuntimeTemplate)
        .filter(RuntimeTemplate.id == runtime_template_id)
        .first()
    )

    if not runtime_template:
        raise HTTPException(status_code=404, detail="Runtime template not found")

    return runtime_template
