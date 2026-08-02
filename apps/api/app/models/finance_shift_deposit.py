from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class FinanceShiftDepositRecord(Base):
    __tablename__ = "finance_shift_deposits"

    id = Column(String(64), primary_key=True)
    form_submission_id = Column(Integer, nullable=True, index=True)
    outlet_id = Column(String(64), nullable=True, index=True)
    outlet_name = Column(String(255), nullable=True)
    business_date = Column(String(32), nullable=False, index=True)
    shift_name = Column(String(64), nullable=False)
    department = Column(String(64), nullable=False, default="bar")
    cashier_name = Column(String(150), nullable=True)
    cash_sales = Column(Float, nullable=False, default=0)
    qris_sales = Column(Float, nullable=False, default=0)
    edc_sales = Column(Float, nullable=False, default=0)
    expected_cash = Column(Float, nullable=False, default=0)
    actual_cash = Column(Float, nullable=False, default=0)
    deposit_amount = Column(Float, nullable=False, default=0)
    variance_amount = Column(Float, nullable=False, default=0)
    variance_reason = Column(Text, nullable=True)
    evidence_urls = Column(JSONB, nullable=False, server_default="[]")
    status = Column(String(40), nullable=False, default="pending_review", index=True)
    finance_note = Column(Text, nullable=True)
    reviewed_by = Column(String(64), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    corrective_task_id = Column(Integer, nullable=True)
    submitted_by = Column(String(64), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
