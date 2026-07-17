from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.form_answer import FormAnswer
from app.models.form_submission import FormSubmission
from app.models.user import User
from app.schemas.form_submission import FormSubmissionCreate, FormSubmissionResponse

router = APIRouter(prefix="/form-submissions", tags=["Form Submissions"])


@router.post("", response_model=FormSubmissionResponse, status_code=status.HTTP_201_CREATED)
def create_form_submission(
    payload: FormSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = FormSubmission(
        form_template_id=payload.form_template_id,
        outlet_id=payload.outlet_id,
        submitted_by=payload.submitted_by or current_user.id,
        status=payload.status,
        score=payload.score,
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

    db.commit()

    stored_submission = (
        db.query(FormSubmission)
        .options(joinedload(FormSubmission.answers))
        .filter(FormSubmission.id == submission.id)
        .first()
    )

    if stored_submission is None:
        raise HTTPException(status_code=500, detail="Failed to persist form submission")

    return stored_submission


@router.get("", response_model=list[FormSubmissionResponse])
def list_form_submissions(
    outlet_id: int | None = Query(default=None),
    form_template_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FormSubmission).options(joinedload(FormSubmission.answers))

    if outlet_id is not None:
        query = query.filter(FormSubmission.outlet_id == outlet_id)

    if form_template_id is not None:
        query = query.filter(FormSubmission.form_template_id == form_template_id)

    if status_filter:
        query = query.filter(FormSubmission.status == status_filter)

    return query.order_by(FormSubmission.id.desc()).all()


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

    return submission
