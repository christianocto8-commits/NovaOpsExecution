from fastapi import APIRouter

from app.schemas.reports import (
    ComplianceReport,
    OutletReport,
    ReportSummary,
    ReportTrendPoint,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary", response_model=ReportSummary)
def get_report_summary():
    return ReportSummary(
        completion_rate=86,
        open_tasks=24,
        overdue_tasks=5,
        compliance_rate=91,
        audit_score=88,
    )


@router.get("/trends", response_model=list[ReportTrendPoint])
def get_report_trends():
    return [
        ReportTrendPoint(date="Mon", completed=18, overdue=3, compliance=84),
        ReportTrendPoint(date="Tue", completed=22, overdue=2, compliance=87),
        ReportTrendPoint(date="Wed", completed=25, overdue=4, compliance=89),
        ReportTrendPoint(date="Thu", completed=28, overdue=3, compliance=91),
        ReportTrendPoint(date="Fri", completed=31, overdue=2, compliance=93),
        ReportTrendPoint(date="Sat", completed=26, overdue=5, compliance=88),
        ReportTrendPoint(date="Sun", completed=30, overdue=4, compliance=90),
    ]


@router.get("/outlets", response_model=list[OutletReport])
def get_outlet_reports():
    return [
        OutletReport(
            outlet_id=1,
            outlet_name="KOV Montre",
            completion_rate=92,
            overdue_tasks=1,
            compliance_rate=95,
            audit_score=91,
        ),
        OutletReport(
            outlet_id=2,
            outlet_name="KOV Heritage",
            completion_rate=88,
            overdue_tasks=2,
            compliance_rate=90,
            audit_score=87,
        ),
        OutletReport(
            outlet_id=3,
            outlet_name="KOV Sultan Agung",
            completion_rate=83,
            overdue_tasks=3,
            compliance_rate=86,
            audit_score=84,
        ),
        OutletReport(
            outlet_id=4,
            outlet_name="KOV Sula",
            completion_rate=79,
            overdue_tasks=4,
            compliance_rate=82,
            audit_score=80,
        ),
    ]


@router.get("/compliance", response_model=list[ComplianceReport])
def get_compliance_reports():
    return [
        ComplianceReport(category="Opening Checklist", score=94, status="excellent"),
        ComplianceReport(category="Cleanliness", score=91, status="excellent"),
        ComplianceReport(category="Product Quality", score=88, status="good"),
        ComplianceReport(category="Service Standard", score=85, status="good"),
        ComplianceReport(category="Inventory Control", score=76, status="warning"),
        ComplianceReport(category="Evidence Upload", score=72, status="warning"),
    ]