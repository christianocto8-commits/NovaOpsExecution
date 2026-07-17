from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.outlet import Outlet
from app.models.task import Task
from app.schemas.reports import (
    ComplianceReport,
    OutletReport,
    ReportSummary,
    ReportTrendPoint,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


def _completion_rate(completed: int, total: int) -> int:
    if total == 0:
        return 0
    return round((completed / total) * 100)


@router.get("/summary", response_model=ReportSummary)
def get_report_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
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
    approved = db.query(func.count(Task.id)).filter(Task.approved_by.isnot(None)).scalar() or 0

    completion_rate = _completion_rate(completed, total)
    compliance_rate = _completion_rate(approved, completed) if completed else completion_rate

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

        trends.append(
            ReportTrendPoint(
                date=label,
                completed=completed,
                overdue=overdue,
                compliance=_completion_rate(completed, day_total),
            )
        )

    return trends


@router.get("/outlets", response_model=list[OutletReport])
def get_outlet_reports(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
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
        approved = (
            db.query(func.count(Task.id))
            .filter(Task.outlet_id == outlet.id, Task.approved_by.isnot(None))
            .scalar()
            or 0
        )

        completion_rate = _completion_rate(completed, total)
        compliance_rate = _completion_rate(approved, completed) if completed else completion_rate

        reports.append(
            OutletReport(
                outlet_id=outlet.id,
                outlet_name=outlet.name,
                completion_rate=completion_rate,
                overdue_tasks=overdue,
                compliance_rate=compliance_rate,
                audit_score=compliance_rate,
            )
        )

    return reports


@router.get("/compliance", response_model=list[ComplianceReport])
def get_compliance_reports(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    summary = get_report_summary(db=db, current_user=current_user)

    return [
        ComplianceReport(
            category="Task Completion",
            score=summary.completion_rate,
            status="healthy" if summary.completion_rate >= 85 else "attention",
        ),
        ComplianceReport(
            category="Overdue Control",
            score=max(0, 100 - (summary.overdue_tasks * 5)),
            status="healthy" if summary.overdue_tasks <= 3 else "attention",
        ),
        ComplianceReport(
            category="Approval Compliance",
            score=summary.compliance_rate,
            status="healthy" if summary.compliance_rate >= 85 else "attention",
        ),
    ]
