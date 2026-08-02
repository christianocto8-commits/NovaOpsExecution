from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, require_jwt_or_api_key
from app.models.user import User
from app.models.execution_session import ExecutionSession
from app.models.form_answer import FormAnswer
from app.models.form_field import FormField
from app.models.form_schedule import FormSchedule
from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.form_template_version import FormTemplateVersion
from app.models.task_schedule import TaskSchedule
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
    FormTemplateVersionResponse,
)
from app.services.form_template_versions import (
    list_form_template_versions,
    restore_form_template_version,
    snapshot_form_template,
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


def _delete_form_template_tree(db: Session, template_id: int) -> None:
    field_ids = [
        row[0]
        for row in db.query(FormField.id)
        .filter(FormField.form_template_id == template_id)
        .all()
    ]
    submission_ids = [
        row[0]
        for row in db.query(FormSubmission.id)
        .filter(FormSubmission.form_template_id == template_id)
        .all()
    ]

    if submission_ids:
        db.query(FormAnswer).filter(
            FormAnswer.form_submission_id.in_(submission_ids)
        ).delete(synchronize_session=False)

    if field_ids:
        db.query(FormAnswer).filter(FormAnswer.form_field_id.in_(field_ids)).delete(
            synchronize_session=False
        )

    db.query(FormSubmission).filter(FormSubmission.form_template_id == template_id).delete(
        synchronize_session=False
    )
    db.query(FormSchedule).filter(FormSchedule.form_template_id == template_id).delete(
        synchronize_session=False
    )
    db.query(TaskSchedule).filter(TaskSchedule.form_template_id == template_id).update(
        {TaskSchedule.form_template_id: None},
        synchronize_session=False,
    )
    db.query(ExecutionSession).filter(
        ExecutionSession.form_template_id == template_id
    ).update({ExecutionSession.form_template_id: None}, synchronize_session=False)
    db.query(FormField).filter(FormField.form_template_id == template_id).delete(
        synchronize_session=False
    )
    deleted = (
        db.query(FormTemplate)
        .filter(FormTemplate.id == template_id)
        .delete(synchronize_session=False)
    )
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Form template not found")


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
def get_form_templates(
    db: Session = Depends(get_db),
    _auth=Depends(require_jwt_or_api_key("read:form-templates")),
):
    del _auth

    return (
        db.query(FormTemplate)
        .options(joinedload(FormTemplate.fields))
        .order_by(FormTemplate.id.desc())
        .all()
    )


@router.get("/{form_template_id}", response_model=FormTemplateResponse)
def get_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user

    return _get_template_or_404(db, form_template_id)


def _template_has_meaningful_changes(
    form_template: FormTemplate,
    payload: FormTemplateUpdate,
) -> bool:
    update_data = payload.model_dump(exclude_unset=True, exclude={"fields"})
    for key, value in update_data.items():
        if getattr(form_template, key) != value:
            return True

    if payload.fields is None:
        return False

    current_fields = sorted(form_template.fields or [], key=lambda item: item.sort_order)
    incoming_fields = payload.fields

    if len(current_fields) != len(incoming_fields):
        return True

    for current, incoming in zip(current_fields, incoming_fields):
        incoming_data = incoming.model_dump()
        comparable = {
            "label": current.label,
            "field_type": current.field_type,
            "placeholder": current.placeholder,
            "help_text": current.help_text,
            "is_required": current.is_required,
            "options_json": current.options_json,
            "validation_json": current.validation_json,
            "sort_order": current.sort_order,
        }
        if comparable != incoming_data:
            return True

    return False


@router.patch("/{form_template_id}", response_model=FormTemplateResponse)
def update_form_template(
    form_template_id: int,
    payload: FormTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = _get_template_or_404(db, form_template_id)

    if _template_has_meaningful_changes(form_template, payload):
        snapshot_form_template(db, form_template, created_by=current_user.id)

    update_data = payload.model_dump(exclude_unset=True, exclude={"fields"})
    for key, value in update_data.items():
        setattr(form_template, key, value)

    if payload.fields is not None:
        _sync_fields(db, form_template, payload.fields)

    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.get("/{form_template_id}/versions", response_model=list[FormTemplateVersionResponse])
def get_form_template_versions(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    del current_user
    _get_template_or_404(db, form_template_id)
    return list_form_template_versions(db, form_template_id)


@router.post(
    "/{form_template_id}/versions/{version_id}/restore",
    response_model=FormTemplateResponse,
)
def restore_form_template_version_endpoint(
    form_template_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = _get_template_or_404(db, form_template_id)
    version = (
        db.query(FormTemplateVersion)
        .filter(
            FormTemplateVersion.id == version_id,
            FormTemplateVersion.form_template_id == form_template_id,
        )
        .first()
    )

    if not version:
        raise HTTPException(status_code=404, detail="Form template version not found")

    restore_form_template_version(
        db,
        form_template,
        version,
        created_by=current_user.id,
    )
    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.post("/{form_template_id}/submit-review", response_model=FormTemplateResponse)
def submit_form_template_review(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = _get_template_or_404(db, form_template_id)
    snapshot_form_template(db, form_template, created_by=current_user.id)
    form_template.form_type = "pending_review"
    form_template.is_active = False
    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.post("/{form_template_id}/approve", response_model=FormTemplateResponse)
def approve_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = _get_template_or_404(db, form_template_id)
    snapshot_form_template(db, form_template, created_by=current_user.id)
    if form_template.form_type in {"draft", "pending_review"}:
        form_template.form_type = "uncategorized"
    form_template.is_active = True
    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.post("/{form_template_id}/archive", response_model=FormTemplateResponse)
def archive_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    form_template = _get_template_or_404(db, form_template_id)
    snapshot_form_template(db, form_template, created_by=current_user.id)
    form_template.is_active = False
    db.commit()
    return _get_template_or_404(db, form_template_id)


@router.post("/{form_template_id}/duplicate", response_model=FormTemplateResponse, status_code=status.HTTP_201_CREATED)
def duplicate_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    source = _get_template_or_404(db, form_template_id)

    duplicate = FormTemplate(
        title=f"{source.title} (Copy)",
        description=source.description,
        form_type="draft",
        outlet_id=source.outlet_id,
        created_by=current_user.id,
        is_active=False,
    )
    db.add(duplicate)
    db.flush()

    for index, field in enumerate(sorted(source.fields, key=lambda item: item.sort_order)):
        db.add(
            FormField(
                form_template_id=duplicate.id,
                label=field.label,
                field_type=field.field_type,
                placeholder=field.placeholder,
                help_text=field.help_text,
                is_required=field.is_required,
                options_json=field.options_json,
                validation_json=field.validation_json,
                sort_order=index,
            )
        )

    db.commit()
    return _get_template_or_404(db, duplicate.id)


@router.delete("/{form_template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_template(
    form_template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_form_actor),
):
    del current_user

    exists = (
        db.query(FormTemplate.id)
        .filter(FormTemplate.id == form_template_id)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Form template not found")

    _delete_form_template_tree(db, form_template_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
