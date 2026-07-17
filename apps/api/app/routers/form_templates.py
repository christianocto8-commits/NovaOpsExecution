from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.user import User
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.security import decode_access_token
from app.modules.tasks.identity_bridge import (
    get_default_identity_outlet,
    get_or_create_legacy_outlet,
    sync_legacy_user,
)
from app.schemas.form_template import (
    FormTemplateCreate,
    FormTemplateResponse,
    FormTemplateUpdate,
)

router = APIRouter(prefix="/form-templates", tags=["Form Templates"])
bearer_scheme = HTTPBearer(auto_error=True)


def _sync_fields(db: Session, form_template: FormTemplate, fields_payload) -> None:
    db.query(FormField).filter(FormField.form_template_id == form_template.id).delete()

    for index, field_payload in enumerate(fields_payload):
        field_data = field_payload.model_dump()
        field_data["sort_order"] = field_data.get("sort_order", index)
        db.add(FormField(form_template_id=form_template.id, **field_data))


def _get_template_or_404(db: Session, form_template_id: int) -> FormTemplate:
    form_template = (
        db.query(FormTemplate)
        .options(joinedload(FormTemplate.fields))
        .filter(FormTemplate.id == form_template_id)
        .first()
    )

    if not form_template:
        raise HTTPException(status_code=404, detail="Form template not found")

    return form_template


def _resolve_form_actor(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        identity_user_id = UUID(str(payload["sub"]))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    identity_user = (
        db.query(IdentityUser)
        .options(joinedload(IdentityUser.role))
        .filter(IdentityUser.id == identity_user_id)
        .first()
    )

    if not identity_user or not identity_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    permissions = set(payload.get("permissions") or [])
    role_slug = str(payload.get("role") or identity_user.role.slug)

    if (
        role_slug not in {"owner", "admin"}
        and "form.create" not in permissions
        and "form.edit" not in permissions
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: form.create",
        )

    identity_outlet = get_default_identity_outlet(identity_user)
    legacy_outlet = (
        get_or_create_legacy_outlet(db, identity_outlet) if identity_outlet else None
    )
    legacy_user = sync_legacy_user(db, identity_user, legacy_outlet)
    db.flush()
    return legacy_user


@router.post("", response_model=FormTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_form_template(
    payload: FormTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = FormTemplate(
        title=payload.title,
        description=payload.description,
        form_type=payload.form_type,
        outlet_id=payload.outlet_id,
        created_by=current_user.id,
        is_active=payload.is_active,
    )
    db.add(form_template)
    db.flush()

    if payload.fields:
        _sync_fields(db, form_template, payload.fields)

    db.commit()
    return _get_template_or_404(db, form_template.id)


@router.get("", response_model=list[FormTemplateResponse])
def get_form_templates(db: Session = Depends(get_db)):
    return (
        db.query(FormTemplate)
        .options(joinedload(FormTemplate.fields))
        .order_by(FormTemplate.id.desc())
        .all()
    )


@router.get("/{form_template_id}", response_model=FormTemplateResponse)
def get_form_template(form_template_id: int, db: Session = Depends(get_db)):
    return _get_template_or_404(db, form_template_id)


@router.patch("/{form_template_id}", response_model=FormTemplateResponse)
def update_form_template(
    form_template_id: int,
    payload: FormTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    del current_user

    form_template = _get_template_or_404(db, form_template_id)

    update_data = payload.model_dump(exclude_unset=True, exclude={"fields"})
    for key, value in update_data.items():
        setattr(form_template, key, value)

    if payload.fields is not None:
        _sync_fields(db, form_template, payload.fields)

    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.delete("/{form_template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    del current_user

    form_template = _get_template_or_404(db, form_template_id)
    db.delete(form_template)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
