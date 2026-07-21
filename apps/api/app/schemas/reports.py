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


class FailedChecklistItemTrend(BaseModel):
    label: str
    field_id: int | None = None
    failure_count: int
    sample_reason: str


class FailedChecklistItemsReport(BaseModel):
    days: int
    limit: int
    items: list[FailedChecklistItemTrend]


class TemplateTrendPoint(BaseModel):
    date: str
    date_key: str
    score: int
    pass_rate: int
    submissions: int


class TemplateTrendsReport(BaseModel):
    template_id: int
    days: int
    points: list[TemplateTrendPoint]


class DigestSendResult(BaseModel):
    sent: bool
    reason: str
    recipients: int
    delivered: int