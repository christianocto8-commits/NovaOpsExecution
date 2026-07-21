from datetime import datetime, timedelta, timezone
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_jwt_or_api_key
from app.models.outlet import Outlet
from app.models.task import Task
from app.modules.tasks.router import resolve_task_outlet_access
from app.schemas.reports import (
    ComplianceReport,
    DigestSendResult,
    FailedChecklistItemTrend,
    FailedChecklistItemsReport,
    OutletReport,
    ReportSummary,
    ReportTrendPoint,
    TemplateTrendPoint,
    TemplateTrendsReport,
)
from app.services.compliance_analytics import (
    get_template_compliance_trends,
    get_top_failed_checklist_items,
)
from app.services.compliance_export import build_compliance_export_pdf, build_compliance_export_xlsx
from app.services.digest_email import send_compliance_digest
from app.services.execution_validation import compliance_score
from app.services.workspace_settings import get_workspace_settings

router = APIRouter(prefix="/reports", tags=["Reports"])


def _completion_rate(completed: int, total: int) -> int:
    if total == 0:
        return 0
    return round((completed / total) * 100)


@router.get("/summary", response_model=ReportSummary)
def get_report_summary(
    db: Session = Depends(get_db),
    _auth=Depends(require_jwt_or_api_key("read:reports")),
):
    del _auth

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    total = db.query(func.count(Task.id)).scalar() or 0
    completed = (
        db.query(func.count(Task.id)).filter(Task.status == "completed").scalar() or 0
    )
    open_tasks = (
        db.query(func.count(Task.id))
        .filter(Task.status.in_(["open", "in_progress", "blocked"]))
        .scalar()
        or 0
    )
    overdue_tasks = (
        db.query(func.count(Task.id))
        .filter(
            Task.due_date.isnot(None),
            Task.due_date < now,
            Task.status != "completed",
            Task.status != "cancelled",
        )
        .scalar()
        or 0
    )

    completion_rate = _completion_rate(completed, total)
    compliance_rate = compliance_score(completion_rate, pass_threshold)

    return ReportSummary(
        completion_rate=completion_rate,
        open_tasks=open_tasks,
        overdue_tasks=overdue_tasks,
        compliance_rate=compliance_rate,
        audit_score=compliance_rate,
    )


@router.get("/trends", response_model=list[ReportTrendPoint])
def get_report_trends(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user

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
                Task.status == "completed",
                Task.completed_at.isnot(None),
                Task.completed_at >= day_start,
                Task.completed_at < day_end,
            )
            .scalar()
            or 0
        )
        overdue = (
            db.query(func.count(Task.id))
            .filter(
                Task.due_date.isnot(None),
                Task.due_date >= day_start,
                Task.due_date < day_end,
                Task.status != "completed",
                Task.status != "cancelled",
            )
            .scalar()
            or 0
        )
        day_total = (
            db.query(func.count(Task.id))
            .filter(Task.created_at >= day_start, Task.created_at < day_end)
            .scalar()
            or 0
        )

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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    now = datetime.now(timezone.utc)
    outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
    reports: list[OutletReport] = []

    for outlet in outlets:
        total = db.query(func.count(Task.id)).filter(Task.outlet_id == outlet.id).scalar() or 0
        completed = (
            db.query(func.count(Task.id))
            .filter(Task.outlet_id == outlet.id, Task.status == "completed")
            .scalar()
            or 0
        )
        overdue = (
            db.query(func.count(Task.id))
            .filter(
                Task.outlet_id == outlet.id,
                Task.due_date.isnot(None),
                Task.due_date < now,
                Task.status != "completed",
                Task.status != "cancelled",
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


@router.get("/compliance", response_model=list[ComplianceReport])
def get_compliance_reports(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user

    workspace_settings = get_workspace_settings(db)
    pass_threshold = workspace_settings.pass_threshold
    summary = get_report_summary(db=db, current_user=current_user)

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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user

    points = get_template_compliance_trends(
        db,
        template_id=template_id,
        days=days,
    )

    return TemplateTrendsReport(
        template_id=template_id,
        days=days,
        points=[TemplateTrendPoint(**point) for point in points],
    )


def _verify_scheduler_secret(x_scheduler_secret: str | None) -> None:
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(status_code=401, detail="Invalid scheduler secret")


@router.post("/compliance/send-digest", response_model=DigestSendResult)
def send_compliance_digest_report(
    force: bool = Query(default=False),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
    db: Session = Depends(get_db),
):
    _verify_scheduler_secret(x_scheduler_secret)

    result = send_compliance_digest(db, force=force)
    return DigestSendResult(**result)


@router.get("/compliance/export")
def export_compliance_report(
    format: str = Query(default="xlsx", alias="format"),
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
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
