import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.form_answer import FormAnswer
from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.user import User
from app.modules.identity.audit import record_identity_audit_event
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import (
    ADMIN_ROLE,
    AREA_MANAGER_ROLE,
    DISTRICT_MANAGER_ROLE,
    OWNER_ROLE,
    REGIONAL_MANAGER_ROLE,
)
from app.modules.finance_handoff.api import (
    create_finance_deposit_from_form_submission,
    notify_finance_deposit_submitted,
)
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.modules.tasks.identity_bridge import get_identity_user_by_email, sync_identity_access
from app.schemas.form_submission import (
    FormSubmissionCreate,
    FormSubmissionReopenUpdate,
    FormSubmissionResponse,
    FormSubmissionReviewUpdate,
)
from app.services.checklist_scoring import score_checklist
from app.services.field_visibility import validate_conditional_required_fields
from app.services.webhook_dispatcher import dispatch_webhook_event

router = APIRouter(prefix="/form-submissions", tags=["Form Submissions"])
logger = logging.getLogger(__name__)


def build_form_submission_response(
    db: Session,
    submission: FormSubmission,
    *,
    outlet_name_by_id: dict[int, str] | None = None,
) -> FormSubmissionResponse:
    payload = FormSubmissionResponse.model_validate(submission).model_dump()
    if outlet_name_by_id is not None:
        outlet_name = outlet_name_by_id.get(submission.outlet_id)
    else:
        outlet = db.get(Outlet, submission.outlet_id)
        outlet_name = outlet.name if outlet else None
    payload["outlet_name"] = outlet_name
    return FormSubmissionResponse(**payload)


def build_form_submission_responses(
    db: Session,
    submissions: list[FormSubmission],
) -> list[FormSubmissionResponse]:
    outlet_ids = {submission.outlet_id for submission in submissions}
    outlet_name_by_id: dict[int, str] = {}
    if outlet_ids:
        outlet_name_by_id = {
            outlet.id: outlet.name
            for outlet in db.query(Outlet).filter(Outlet.id.in_(outlet_ids)).all()
        }

    return [
        build_form_submission_response(
            db, submission, outlet_name_by_id=outlet_name_by_id
        )
        for submission in submissions
    ]


def resolve_form_submission_scope(
    db: Session,
    current_user: User,
) -> tuple[list[int] | None, bool]:
    identity_user = get_identity_user_by_email(db, current_user.email)

    if identity_user:
        _legacy_user, outlet_ids, full_access = sync_identity_access(
            db, identity_user, include_head_office_full_access=False
        )
        db.commit()
        return outlet_ids, full_access

    if current_user.outlet_id is not None:
        return [current_user.outlet_id], False

    return [], False


def ensure_form_submission_outlet_access(
    db: Session,
    current_user: User,
    outlet_id: int,
) -> None:
    outlet_ids, full_access = resolve_form_submission_scope(db, current_user)

    if full_access:
        return

    if outlet_id not in (outlet_ids or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet submission",
        )


REVIEW_MANAGER_ROLES = {
    REGIONAL_MANAGER_ROLE,
    DISTRICT_MANAGER_ROLE,
    AREA_MANAGER_ROLE,
}


def can_review_form_submissions(db: Session, current_user: User, outlet_id: int) -> bool:
    outlet_ids, full_access = resolve_form_submission_scope(db, current_user)

    if full_access:
        return True

    identity_user = get_identity_user_by_email(db, current_user.email)
    role_slug = identity_user.role.slug if identity_user and identity_user.role else ""
    if role_slug in REVIEW_MANAGER_ROLES and outlet_id in (outlet_ids or []):
        return True

    return False


def notify_owner_admin_form_submitted(
    db: Session,
    *,
    submission: FormSubmission,
    template: FormTemplate | None,
    outlet: Outlet | None,
    submitted_by: User,
) -> None:
    roles = db.scalars(select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE]))).all()
    role_ids = [role.id for role in roles]

    if not role_ids:
        return

    recipients = db.scalars(
        select(IdentityUser).where(
            IdentityUser.role_id.in_(role_ids),
            IdentityUser.is_active.is_(True),
        )
    ).all()

    if not recipients:
        return

    template_name = template.title if template else f"Form #{submission.form_template_id}"
    outlet_name = outlet.name if outlet else f"Outlet #{submission.outlet_id}"
    score = round(float(submission.score or 0))
    subject = f"MyForm submitted: {template_name}"
    body = (
        f"{submitted_by.name or submitted_by.email} submitted {template_name} "
        f"from {outlet_name}. Score: {score}%."
    )
    payload = {
        "event_type": "form_submitted",
        "submission_id": submission.id,
        "form_template_id": submission.form_template_id,
        "template_name": template_name,
        "outlet_id": submission.outlet_id,
        "outlet_name": outlet_name,
        "score": submission.score,
        "status": submission.status,
        "submitted_by": submitted_by.id,
    }
    notification_service = NotificationService(db)

    for recipient in recipients:
        notification_service.create_event(
            NotificationEventCreate(
                event_type="form_submitted",
                source_module="forms",
                source_entity_type="form_submission",
                source_entity_id=str(submission.id),
                recipient_user_id=recipient.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )


@router.post("", response_model=FormSubmissionResponse, status_code=status.HTTP_201_CREATED)
def create_form_submission(
    payload: FormSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_form_submission_outlet_access(db, current_user, payload.outlet_id)

    if payload.client_ref:
        existing = (
            db.query(FormSubmission)
            .filter(FormSubmission.client_ref == payload.client_ref)
            .first()
        )
        if existing:
            existing_with_answers = (
                db.query(FormSubmission)
                .options(joinedload(FormSubmission.answers))
                .filter(FormSubmission.id == existing.id)
                .first()
            )
            return existing_with_answers

    responses = {
        str(answer.form_field_id): (
            answer.answer_text
            or (str(answer.answer_number) if answer.answer_number is not None else "")
            or ("yes" if answer.answer_boolean is True else "no" if answer.answer_boolean is False else "")
        )
        for answer in payload.answers
    }

    validate_conditional_required_fields(
        db,
        form_template_id=payload.form_template_id,
        responses=responses,
    )

    checklist_result = score_checklist(
        db,
        form_template_id=payload.form_template_id,
        answers_json={"responses": responses},
    )

    submission = FormSubmission(
        form_template_id=payload.form_template_id,
        outlet_id=payload.outlet_id,
        submitted_by=current_user.id,
        status=payload.status,
        score=payload.score if payload.score is not None else checklist_result["score"],
        responsible_person_name=payload.responsible_person_name,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    db.flush()

    for answer_payload in payload.answers:
        db.add(
            FormAnswer(
                form_submission_id=submission.id,
                **answer_payload.model_dump(),
            )
        )

    db.flush()

    stored_submission = (
        db.query(FormSubmission)
        .options(joinedload(FormSubmission.answers))
        .filter(FormSubmission.id == submission.id)
        .first()
    )

    if stored_submission is None:
        raise HTTPException(status_code=500, detail="Failed to persist form submission")

    template = db.get(FormTemplate, stored_submission.form_template_id)
    outlet = db.get(Outlet, stored_submission.outlet_id)
    identity_user = get_identity_user_by_email(db, current_user.email)
    finance_deposit = None

    try:
        finance_deposit = create_finance_deposit_from_form_submission(
            db,
            submission=stored_submission,
            template=template,
            submitted_by_legacy_user_id=current_user.id,
            submitted_by_identity_user=identity_user,
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception(
            "Failed to save finance report for form submission %s",
            stored_submission.id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Submission could not be saved to Finance Reports. Please try again.",
        ) from exc

    if finance_deposit:
        try:
            notify_finance_deposit_submitted(
                db,
                deposit=finance_deposit,
                legacy_outlet_id=stored_submission.outlet_id,
            )
        except Exception:
            db.rollback()
            logger.exception(
                "Finance report %s was saved but notification delivery failed",
                finance_deposit.id,
            )

    try:
        notify_owner_admin_form_submitted(
            db,
            submission=stored_submission,
            template=template,
            outlet=outlet,
            submitted_by=current_user,
        )
    except Exception:
        db.rollback()
        logger.exception(
            "Form submission %s was saved but owner/admin notification delivery failed",
            stored_submission.id,
        )

    try:
        dispatch_webhook_event(
            db,
            event_type="form.submitted",
            outlet_id=stored_submission.outlet_id,
            payload={
                "submission_id": stored_submission.id,
                "form_template_id": stored_submission.form_template_id,
                "outlet_id": stored_submission.outlet_id,
                "score": stored_submission.score,
                "status": stored_submission.status,
                "responsible_person_name": stored_submission.responsible_person_name,
            },
        )
    except Exception:
        db.rollback()
        logger.exception(
            "Form submission %s was saved but webhook dispatch failed",
            stored_submission.id,
        )

    return build_form_submission_response(db, stored_submission)


@router.get("", response_model=list[FormSubmissionResponse])
def list_form_submissions(
    outlet_id: int | None = Query(default=None),
    form_template_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FormSubmission).options(joinedload(FormSubmission.answers))
    outlet_ids, full_access = resolve_form_submission_scope(db, current_user)

    if outlet_id is not None:
        if not full_access and outlet_id not in (outlet_ids or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no access to this outlet submission",
            )
        query = query.filter(FormSubmission.outlet_id == outlet_id)
    elif not full_access:
        if not outlet_ids:
            return []
        query = query.filter(FormSubmission.outlet_id.in_(outlet_ids))

    if form_template_id is not None:
        query = query.filter(FormSubmission.form_template_id == form_template_id)

    if status_filter:
        query = query.filter(FormSubmission.status == status_filter)

    submissions = query.order_by(FormSubmission.id.desc()).all()
    return build_form_submission_responses(db, submissions)


@router.get("/{submission_id}", response_model=FormSubmissionResponse)
def get_form_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = (
        db.query(FormSubmission)
        .options(joinedload(FormSubmission.answers))
        .filter(FormSubmission.id == submission_id)
        .first()
    )

    if submission is None:
        raise HTTPException(status_code=404, detail="Form submission not found")

    ensure_form_submission_outlet_access(db, current_user, submission.outlet_id)

    return build_form_submission_response(db, submission)

@router.patch("/{submission_id}/review", response_model=FormSubmissionResponse)
def review_form_submission(
    submission_id: int,
    payload: FormSubmissionReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = (
        db.query(FormSubmission)
        .options(joinedload(FormSubmission.answers))
        .filter(FormSubmission.id == submission_id)
        .first()
    )

    if submission is None:
        raise HTTPException(status_code=404, detail="Form submission not found")

    if not can_review_form_submissions(db, current_user, submission.outlet_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner/admin or the managing area/district/regional manager can review form submissions",
        )

    submission.status = payload.review
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.now(timezone.utc)
    db.add(submission)
    db.flush()

    try:
        record_identity_audit_event(
            db,
            action=f"form_submission_{payload.review}",
            resource_type="form_submission",
            actor_user_id=None,
            resource_id=str(submission.id),
            metadata={
                "submission_id": submission.id,
                "outlet_id": submission.outlet_id,
                "form_template_id": submission.form_template_id,
                "review": payload.review,
                "note": payload.note,
                "reviewed_by_legacy_user_id": current_user.id,
            },
        )
    except Exception:
        pass

    try:
        dispatch_webhook_event(
            db,
            event_type=f"form.{payload.review}",
            outlet_id=submission.outlet_id,
            payload={
                "submission_id": submission.id,
                "form_template_id": submission.form_template_id,
                "outlet_id": submission.outlet_id,
                "score": submission.score,
                "status": submission.status,
                "review_note": payload.note,
                "reviewed_by": current_user.id,
            },
        )
    except Exception:
        pass

    db.commit()
    db.refresh(submission)
    return build_form_submission_response(db, submission)


@router.post("/{submission_id}/reopen", response_model=FormSubmissionResponse)
def reopen_form_submission(
    submission_id: int,
    payload: FormSubmissionReopenUpdate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = (
        db.query(FormSubmission)
        .options(joinedload(FormSubmission.answers))
        .filter(FormSubmission.id == submission_id)
        .first()
    )

    if submission is None:
        raise HTTPException(status_code=404, detail="Form submission not found")

    if submission.status not in {"rejected", "approved"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only rejected or approved submissions can be reopened",
        )

    ensure_form_submission_outlet_access(db, current_user, submission.outlet_id)

    previous_status = submission.status
    submission.status = "submitted"
    submission.reviewed_by = None
    submission.reviewed_at = None
    db.add(submission)
    db.flush()

    try:
        record_identity_audit_event(
            db,
            action="form_submission_reopened",
            resource_type="form_submission",
            actor_user_id=None,
            resource_id=str(submission.id),
            metadata={
                "submission_id": submission.id,
                "outlet_id": submission.outlet_id,
                "form_template_id": submission.form_template_id,
                "previous_status": previous_status,
                "note": payload.note if payload else None,
                "reopened_by_legacy_user_id": current_user.id,
            },
        )
    except Exception:
        pass

    try:
        dispatch_webhook_event(
            db,
            event_type="form.reopened",
            outlet_id=submission.outlet_id,
            payload={
                "submission_id": submission.id,
                "form_template_id": submission.form_template_id,
                "outlet_id": submission.outlet_id,
                "status": submission.status,
                "review_note": payload.note if payload else None,
                "reopened_by": current_user.id,
            },
        )
    except Exception:
        pass

    db.commit()
    db.refresh(submission)
    return build_form_submission_response(db, submission)
