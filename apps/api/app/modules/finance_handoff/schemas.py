from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class FinanceShiftDeposit(BaseModel):
    id: str
    form_submission_id: int | None = None
    outlet_id: str | None = None
    outlet_name: str | None = None
    business_date: str
    shift_name: str
    department: str = "bar"
    cashier_name: str | None = None
    cash_sales: float = 0
    qris_sales: float = 0
    edc_sales: float = 0
    expected_cash: float = 0
    actual_cash: float = 0
    deposit_amount: float = 0
    variance_amount: float = 0
    variance_reason: str | None = None
    evidence_urls: list[str] = Field(default_factory=list)
    status: str = "pending_review"
    finance_note: str | None = None
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    corrective_task_id: int | None = None
    submitted_by: str | None = None
    submitted_at: datetime


class FinanceShiftDepositCreate(BaseModel):
    outlet_id: str | None = None
    outlet_name: str | None = None
    business_date: str
    shift_name: str
    department: str = "bar"
    cashier_name: str | None = None
    cash_sales: float = 0
    qris_sales: float = 0
    edc_sales: float = 0
    expected_cash: float = 0
    actual_cash: float = 0
    deposit_amount: float = 0
    variance_reason: str | None = None
    evidence_urls: list[str] = Field(default_factory=list)


class FinanceShiftDepositReview(BaseModel):
    status: str
    finance_note: str | None = None


class FinanceSummary(BaseModel):
    pending_review: int
    approved: int
    rejected: int
    correction_requested: int
    total_deposit_amount: float
    total_variance_amount: float
    discrepancy_count: int
    discrepancy_threshold: float
