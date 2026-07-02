from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.form_template import FormTemplate
from app.schemas.form_template import FormTemplateCreate, FormTemplateResponse

router = APIRouter(prefix="/form-templates", tags=["Form Templates"])


@router.post("", response_model=FormTemplateResponse)
def create_form_template(payload: FormTemplateCreate, db: Session = Depends(get_db)):
    form_template = FormTemplate(**payload.model_dump())
    db.add(form_template)
    db.commit()
    db.refresh(form_template)
    return form_template


@router.get("", response_model=list[FormTemplateResponse])
def get_form_templates(db: Session = Depends(get_db)):
    return db.query(FormTemplate).order_by(FormTemplate.id.desc()).all()


@router.get("/{form_template_id}", response_model=FormTemplateResponse)
def get_form_template(form_template_id: int, db: Session = Depends(get_db)):
    form_template = db.query(FormTemplate).filter(FormTemplate.id == form_template_id).first()

    if not form_template:
        raise HTTPException(status_code=404, detail="Form template not found")

    return form_template