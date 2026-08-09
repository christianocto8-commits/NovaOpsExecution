from datetime import datetime, timedelta, timezone

import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, or_, true
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.core.database import get_db
from app.core.deps import get_current_user, require_jwt_or_api_key
from app.core.scheduler import verify_scheduler_secret
from app.models.outlet import Outlet
from app.models.app_settings import AppSettings
from app.models.form_submission import FormSubmission
from app.models.task import Task
from app.modules.identity.dependencies import require_permission
from app.modules.api_keys.models import ApiKey
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.permissions import FINANCE_HEAD_OFFICE_ROLE, FINANCE_ROLE
from app.modules.tasks.router import resolve_task_outlet_access
from app.schemas.reports import (
    ComplianceReport,
    BenchmarkSummary,
    DigestSendResult,
    FailedChecklistItemTrend,
    FailedChecklistItemsReport,
    OutletReport,
    OutletBenchmarkReport,
    ReportSummary,
    ReportTrendPoint,
    ScheduledReportConfig,
    TemplateTrendPoint,
    TemplateTrendsReport,
)
from app.services.compliance_analytics import (
    get_template_compliance_trends,
    get_top_failed_checklist_items,
)
from app.services.audit_bundle_export import build_audit_bundle_zip
from app.services.compliance_export import build_compliance_export_pdf, build_compliance_export_xlsx
from app.services.digest_email import send_compliance_digest
from app.services.execution_validation import compliance_score
from app.services.workspace_settings import get_workspace_settings

router = APIRouter(prefix="/reports", tags=["Reports"])
SCHEDULED_REPORT_KEY = "scheduled_report_config"


def _ensure_operational_report_access(db: Session, current_user) -> None:
    identity_user = db.query(IdentityUser).filter(IdentityUser.email == current_user.email).first()
    role_slug = identity_user.role.slug if identity_user and identity_user.role else ""
    if role_slug in {FINANCE_ROLE, FINANCE_HEAD_OFFICE_ROLE}:
        raise HTTPException(
            status_code=403,
            detail="Finance accounts can access Finance Reports only",
        )


def _resolve_report_scope(db: Session, current_user, x_outlet_id: str | None):
    if isinstance(current_user, ApiKey):
        return None, None, True
    _ensure_operational_report_access(db, current_user)
    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )
    return outlet_id, outlet_ids, full_access


def _completion_rate(completed: int, total: int) -> int:
    if total == 0:
        return 0
    return round((completed / total) * 100)


def _task_overdue_filter(now: datetime) -> ColumnElement[bool]:
    """Overdue = past due, not completed, and not manually cancelled.

    Auto-expired tasks (status cancelled + expired_at set) still count as
    overdue, matching the frontend's isTaskExpiredOverdue semantics.
    """
    return (
        Task.due_date.isnot(None),
        Task.due_date < now,
        Task.status != "completed",
        or_(Task.status != "cancelled", Task.expired_at.isnot(None)),
    )


def _task_outlet_scope(
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    full_access: bool,
) -> ColumnElement[bool]:
    if outlet_id is not None:
        return Task.outlet_id == outlet_id
    if outlet_ids is not None:
        return Task.outlet_id.in_(outlet_ids)
    if not full_access:
        return Task.id == -1
    return true()


def _form_submission_outlet_scope(
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    full_access: bool,
) -> ColumnElement[bool]:
    if outlet_id is not None:
        return FormSubmission.outlet_id == outlet_id
    if outlet_ids is not None:
        return FormSubmission.outlet_id.in_(outlet_ids)
    if not full_access:
        return FormSubmission.id == -1
    return true()


def _valid_task_filter() -> ColumnElement[bool]:
    """Filter out manually or auto-cancelled duplicate tasks.

    Only include active tasks, completed tasks, or auto-expired tasks.
    """
    return or_(Task.status != "cancelled", Task.expired_at.isnot(None))


def _build_report_summary(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    full_access: bool = True,
) -> ReportSummary:
    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    outlet_scope = _task_outlet_scope(outlet_id, outlet_ids, full_access)
    submission_scope = _form_submission_outlet_scope(
        outlet_id, outlet_ids, full_access
    )

    task_total = (
        db.query(func.count(Task.id))
        .filter(outlet_scope, _valid_task_filter())
        .scalar()
        or 0
    )
    task_completed = (
        db.query(func.count(Task.id))
        .filter(outlet_scope, Task.status == "completed")
        .scalar()
        or 0
    )
    manual_submissions = (
        db.query(func.count(FormSubmission.id))
        .filter(submission_scope, FormSubmission.status != "draft")
        .scalar()
        or 0
    )
    total = task_total + manual_submissions
    completed = task_completed + manual_submissions
    open_tasks = (
        db.query(func.count(Task.id))
        .filter(
            outlet_scope,
            Task.status.in_(["open", "in_progress", "blocked"]),
        )
        .scalar()
        or 0
    )
    overdue_tasks = (
        db.query(func.count(Task.id))
        .filter(outlet_scope, *_task_overdue_filter(now))
        .scalar()
        or 0
    )

    completion_rate = _completion_rate(completed, total)
    compliance_rate = compliance_score(completion_rate, pass_threshold)

    return ReportSummary(
        total_items=total,
        completed_items=completed,
        manual_submissions=manual_submissions,
        completion_rate=completion_rate,
        open_tasks=open_tasks,
        overdue_tasks=overdue_tasks,
        compliance_rate=compliance_rate,
        audit_score=compliance_rate,
    )


@router.get("/summary", response_model=ReportSummary)
def get_report_summary(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(require_jwt_or_api_key("read:reports")),
):
    if isinstance(current_user, ApiKey):
        return _build_report_summary(db)

    _ensure_operational_report_access(db, current_user)
    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    return _build_report_summary(
        db,
        outlet_id=outlet_id,
        outlet_ids=None if outlet_id else outlet_ids,
        full_access=full_access,
    )


@router.get("/trends", response_model=list[ReportTrendPoint])
def get_report_trends(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(require_jwt_or_api_key("read:reports")),
):
    outlet_id, outlet_ids, full_access = _resolve_report_scope(db, current_user, x_outlet_id)
    outlet_scope = _task_outlet_scope(
        outlet_id,
        None if outlet_id else outlet_ids,
        full_access,
    )
    submission_scope = _form_submission_outlet_scope(
        outlet_id,
        None if outlet_id else outlet_ids,
        full_access,
    )

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    trends: list[ReportTrendPoint] = []

    for offset in range(6, -1, -1):
        day_start = (now - timedelta(days=offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)
        label = day_start.strftime("%a")

        completed = (
            db.query(func.count(Task.id))
            .filter(
                outlet_scope,
                Task.status == "completed",
                Task.completed_at.isnot(None),
                Task.completed_at >= day_start,
                Task.completed_at < day_end,
            )
            .scalar()
            or 0
        )
        manual_submissions = (
            db.query(func.count(FormSubmission.id))
            .filter(
                submission_scope,
                FormSubmission.status != "draft",
                FormSubmission.submitted_at >= day_start,
                FormSubmission.submitted_at < day_end,
            )
            .scalar()
            or 0
        )
        overdue = (
            db.query(func.count(Task.id))
            .filter(
                outlet_scope,
                Task.due_date.isnot(None),
                Task.due_date >= day_start,
                Task.due_date < day_end,
                Task.status != "completed",
                or_(Task.status != "cancelled", Task.expired_at.isnot(None)),
            )
            .scalar()
            or 0
        )
        task_day_total = (
            db.query(func.count(Task.id))
            .filter(
                outlet_scope,
                _valid_task_filter(),
                Task.created_at >= day_start,
                Task.created_at < day_end,
            )
            .scalar()
            or 0
        )
        day_total = task_day_total + manual_submissions
        completed += manual_submissions

        day_completion = _completion_rate(completed, day_total)
        trends.append(
            ReportTrendPoint(
                date=label,
                completed=completed,
                overdue=overdue,
                compliance=compliance_score(day_completion, pass_threshold),
            )
        )

    return trends


@router.get("/outlets", response_model=list[OutletReport])
def get_outlet_reports(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(require_jwt_or_api_key("read:reports")),
):
    outlet_id, outlet_ids, full_access = _resolve_report_scope(db, current_user, x_outlet_id)

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    outlet_query = db.query(Outlet)
    if outlet_id is not None:
        outlet_query = outlet_query.filter(Outlet.id == outlet_id)
    elif not full_access:
        outlet_query = outlet_query.filter(
            Outlet.id.in_(outlet_ids) if outlet_ids else Outlet.id == -1
        )
    outlets = outlet_query.order_by(Outlet.id.asc()).all()
    reports: list[OutletReport] = []

    for outlet in outlets:
        task_total = (
            db.query(func.count(Task.id))
            .filter(Task.outlet_id == outlet.id, _valid_task_filter())
            .scalar()
            or 0
        )
        task_completed = (
            db.query(func.count(Task.id))
            .filter(Task.outlet_id == outlet.id, Task.status == "completed")
            .scalar()
            or 0
        )
        manual_submissions = (
            db.query(func.count(FormSubmission.id))
            .filter(
                FormSubmission.outlet_id == outlet.id,
                FormSubmission.status != "draft",
            )
            .scalar()
            or 0
        )
        total = task_total + manual_submissions
        completed = task_completed + manual_submissions
        overdue = (
            db.query(func.count(Task.id))
            .filter(
                Task.outlet_id == outlet.id,
                *_task_overdue_filter(now),
            )
            .scalar()
            or 0
        )

        completion_rate = _completion_rate(completed, total)
        outlet_compliance = compliance_score(completion_rate, pass_threshold)

        reports.append(
            OutletReport(
                outlet_id=outlet.id,
                outlet_name=outlet.name,
                completion_rate=completion_rate,
                overdue_tasks=overdue,
                compliance_rate=outlet_compliance,
                audit_score=outlet_compliance,
            )
        )

    return reports


@router.get("/benchmarks", response_model=BenchmarkSummary)
def get_outlet_benchmarks(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(require_jwt_or_api_key("read:reports")),
):
    outlet_id, outlet_ids, full_access = _resolve_report_scope(db, current_user, x_outlet_id)

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    outlet_query = db.query(Outlet)
    if outlet_id is not None:
        outlet_query = outlet_query.filter(Outlet.id == outlet_id)
    elif not full_access:
        outlet_query = outlet_query.filter(
            Outlet.id.in_(outlet_ids) if outlet_ids else Outlet.id == -1
        )
    outlets = outlet_query.order_by(Outlet.name.asc()).all()
    rows: list[OutletBenchmarkReport] = []
    raw_scores: list[int] = []

    for outlet in outlets:
        task_total = db.query(func.count(Task.id)).filter(Task.outlet_id == outlet.id).scalar() or 0
        task_completed = (
            db.query(func.count(Task.id))
            .filter(Task.outlet_id == outlet.id, Task.status == "completed")
            .scalar()
            or 0
        )
        manual_submissions = (
            db.query(func.count(FormSubmission.id))
            .filter(
                FormSubmission.outlet_id == outlet.id,
                FormSubmission.status != "draft",
            )
            .scalar()
            or 0
        )
        total = task_total + manual_submissions
        completed = task_completed + manual_submissions
        overdue = (
            db.query(func.count(Task.id))
            .filter(
                Task.outlet_id == outlet.id,
                *_task_overdue_filter(now),
            )
            .scalar()
            or 0
        )
        completion_rate = _completion_rate(completed, total)
        compliance_rate = compliance_score(completion_rate, pass_threshold)
        raw_scores.append(compliance_rate)
        status_label = "healthy"
        if compliance_rate < pass_threshold or overdue > 3:
            status_label = "at_risk"
        elif overdue > 0:
            status_label = "watch"

        rows.append(
            OutletBenchmarkReport(
                rank=0,
                outlet_id=outlet.id,
                outlet_name=outlet.name,
                region=outlet.region,
                district=outlet.district,
                completed_tasks=completed,
                total_tasks=total,
                completion_rate=completion_rate,
                overdue_tasks=overdue,
                compliance_rate=compliance_rate,
                audit_score=compliance_rate,
                score_delta_from_average=0,
                status=status_label,
            )
        )

    average = round(sum(raw_scores) / len(raw_scores)) if raw_scores else 0
    ranked = sorted(rows, key=lambda row: (row.compliance_rate, -row.overdue_tasks), reverse=True)
    for index, row in enumerate(ranked, start=1):
        row.rank = index
        row.score_delta_from_average = row.compliance_rate - average

    return BenchmarkSummary(
        average_compliance=average,
        best_outlet=ranked[0].outlet_name if ranked else None,
        worst_outlet=ranked[-1].outlet_name if ranked else None,
        at_risk_outlets=sum(1 for row in ranked if row.status == "at_risk"),
        outlets=ranked,
    )


def _load_scheduled_report_config(db: Session) -> ScheduledReportConfig:
    row = db.query(AppSettings).filter(AppSettings.key == SCHEDULED_REPORT_KEY).first()
    if not row:
        return ScheduledReportConfig()
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return ScheduledReportConfig()
    return ScheduledReportConfig(**payload)


@router.get("/scheduled", response_model=ScheduledReportConfig)
def get_scheduled_report_config(
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("report.read")),
):
    _ensure_operational_report_access(db, current_user)
    return _load_scheduled_report_config(db)


@router.put("/scheduled", response_model=ScheduledReportConfig)
def update_scheduled_report_config(
    payload: ScheduledReportConfig,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("report.export")),
):
    _ensure_operational_report_access(db, current_user)
    row = db.query(AppSettings).filter(AppSettings.key == SCHEDULED_REPORT_KEY).first()
    serialized = json.dumps(payload.model_dump(), default=str)
    if row:
        row.payload = serialized
    else:
        row = AppSettings(key=SCHEDULED_REPORT_KEY, payload=serialized)
        db.add(row)
    db.commit()
    return payload


@router.get("/compliance", response_model=list[ComplianceReport])
def get_compliance_reports(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_operational_report_access(db, current_user)
    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    pass_threshold = get_workspace_settings(db).pass_threshold
    summary = _build_report_summary(
        db,
        outlet_id=outlet_id,
        outlet_ids=None if outlet_id else outlet_ids,
        full_access=full_access,
    )

    return [
        ComplianceReport(
            category="Task Completion",
            score=summary.completion_rate,
            status="healthy" if summary.completion_rate >= pass_threshold else "attention",
        ),
        ComplianceReport(
            category="Overdue Control",
            score=max(0, 100 - (summary.overdue_tasks * 5)),
            status="healthy" if summary.overdue_tasks <= 3 else "attention",
        ),
        ComplianceReport(
            category="Pass Threshold",
            score=summary.compliance_rate,
            status="healthy" if summary.completion_rate >= pass_threshold else "attention",
        ),
    ]


@router.get("/compliance/failed-items", response_model=FailedChecklistItemsReport)
def get_failed_checklist_items(
    limit: int = Query(default=10, ge=1, le=50),
    days: int = Query(default=30, ge=1, le=365),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_operational_report_access(db, current_user)
    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    rows = get_top_failed_checklist_items(
        db,
        limit=limit,
        days=days,
        outlet_id=outlet_id,
        outlet_ids=None if outlet_id else outlet_ids,
        all_outlets=full_access and outlet_id is None,
    )

    return FailedChecklistItemsReport(
        days=days,
        limit=limit,
        items=[FailedChecklistItemTrend(**row) for row in rows],
    )


@router.get("/compliance/template-trends", response_model=TemplateTrendsReport)
def get_template_compliance_trends_report(
    template_id: int = Query(..., ge=1),
    days: int = Query(default=30, ge=1, le=365),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_operational_report_access(db, current_user)
    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    points = get_template_compliance_trends(
        db,
        template_id=template_id,
        days=days,
        outlet_id=outlet_id,
        outlet_ids=None if outlet_id else outlet_ids,
        all_outlets=full_access and outlet_id is None,
    )

    return TemplateTrendsReport(
        template_id=template_id,
        days=days,
        points=[TemplateTrendPoint(**point) for point in points],
    )


@router.post("/compliance/send-digest", response_model=DigestSendResult)
def send_compliance_digest_report(
    force: bool = Query(default=False),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
    db: Session = Depends(get_db),
):
    verify_scheduler_secret(x_scheduler_secret)

    result = send_compliance_digest(db, force=force)
    return DigestSendResult(**result)


@router.post("/compliance/send-digest-now", response_model=DigestSendResult)
def send_compliance_digest_now(
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("report.export")),
):
    _ensure_operational_report_access(db, current_user)

    result = send_compliance_digest(db, force=True)
    return DigestSendResult(**result)


@router.get("/compliance/export")
def export_compliance_report(
    format: str = Query(default="xlsx", alias="format"),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_operational_report_access(db, current_user)
    export_format = format.lower()

    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db, current_user, x_outlet_id
    )

    if export_format == "xlsx":
        content = build_compliance_export_xlsx(
            db,
            outlet_id=outlet_id,
            outlet_ids=None if outlet_id else outlet_ids,
            all_outlets=full_access and outlet_id is None,
        )
        filename = f"compliance-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.xlsx"
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if export_format == "pdf":
        content = build_compliance_export_pdf(
            db,
            outlet_id=outlet_id,
            outlet_ids=None if outlet_id else outlet_ids,
            all_outlets=full_access and outlet_id is None,
        )
        filename = f"compliance-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    raise HTTPException(status_code=400, detail="Supported export formats: xlsx, pdf")


@router.get("/compliance/audit-bundle")
def export_compliance_audit_bundle(
    days: int = Query(default=30, ge=1, le=365),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _permission=Depends(require_permission("report.export")),
):
    del _permission

    outlet_id, _actor_id, outlet_ids, full_access = resolve_task_outlet_access(
        db,
        current_user,
        x_outlet_id,
    )
    content = build_audit_bundle_zip(
        db,
        days=days,
        outlet_id=outlet_id,
        outlet_ids=None if outlet_id else outlet_ids,
        all_outlets=full_access and outlet_id is None,
    )
    filename = f"novaops-audit-bundle-{datetime.now(timezone.utc).strftime('%Y%m%d')}.zip"
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
