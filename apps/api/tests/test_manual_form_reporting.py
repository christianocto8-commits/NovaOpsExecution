import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.routers.reports import _build_report_summary


def test_manual_form_submission_is_included_in_report_summary(db: Session):
    outlet = Outlet(
        name="Manual Form Reporting Outlet",
        code=f"REPORT-{uuid.uuid4().hex[:10]}",
        is_active=True,
    )
    db.add(outlet)
    db.flush()

    template = FormTemplate(
        title="Manual Reporting Template",
        form_type="audit",
        outlet_id=outlet.id,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    db.add(
        FormSubmission(
            form_template_id=template.id,
            outlet_id=outlet.id,
            submitted_by=1,
            status="submitted",
            score=88,
            submitted_at=datetime.now(timezone.utc),
        )
    )
    db.flush()

    summary = _build_report_summary(db, outlet_id=outlet.id)

    assert summary.total_items == 1
    assert summary.completed_items == 1
    assert summary.manual_submissions == 1
    assert summary.completion_rate == 100
