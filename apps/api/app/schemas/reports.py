from pydantic import BaseModel


class ReportSummary(BaseModel):
    completion_rate: int
    open_tasks: int
    overdue_tasks: int
    compliance_rate: int
    audit_score: int


class ReportTrendPoint(BaseModel):
    date: str
    completed: int
    overdue: int
    compliance: int


class OutletReport(BaseModel):
    outlet_id: int
    outlet_name: str
    completion_rate: int
    overdue_tasks: int
    compliance_rate: int
    audit_score: int


class ComplianceReport(BaseModel):
    category: str
    score: int
    status: str