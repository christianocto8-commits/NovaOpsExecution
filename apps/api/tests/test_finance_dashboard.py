"""Finance dashboard aggregation for reports entering finance."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.modules.finance_handoff.api import (
    _build_daily_trend,
    _build_finance_summary,
    _build_outlet_breakdown,
)
from app.modules.finance_handoff.schemas import FinanceShiftDeposit


def _deposit(**overrides):
    payload = {
        "id": "deposit-1",
        "outlet_id": "1",
        "outlet_name": "Outlet A",
        "business_date": "2026-08-02",
        "shift_name": "morning",
        "department": "cashier",
        "cash_sales": 100000,
        "qris_sales": 50000,
        "edc_sales": 25000,
        "expected_cash": 100000,
        "actual_cash": 95000,
        "deposit_amount": 95000,
        "variance_amount": -5000,
        "status": "pending_review",
        "submitted_at": datetime(2026, 8, 2, 8, 0, tzinfo=timezone.utc),
    }
    payload.update(overrides)
    return FinanceShiftDeposit(**payload)


def test_finance_summary_includes_incoming_and_sales_totals(monkeypatch):
    monkeypatch.setattr(
        "app.modules.finance_handoff.api.datetime",
        SimpleNamespace(
            now=lambda tz=None: datetime(2026, 8, 2, 12, 0, tzinfo=timezone.utc),
            fromisoformat=datetime.fromisoformat,
        ),
    )

    deposits = [
        _deposit(),
        _deposit(
            id="deposit-2",
            outlet_id="2",
            outlet_name="Outlet B",
            status="approved",
            deposit_amount=120000,
            cash_sales=120000,
            qris_sales=0,
            edc_sales=0,
            variance_amount=60000,
            business_date="2026-08-01",
        ),
    ]

    summary = _build_finance_summary(deposits)

    assert summary.total_reports == 2
    assert summary.pending_review == 1
    assert summary.approved == 1
    assert summary.incoming_today == 1
    assert summary.total_deposit_amount == 215000
    assert summary.total_cash_sales == 220000
    assert summary.discrepancy_count == 1


def test_finance_outlet_breakdown_groups_reports():
    deposits = [
        _deposit(),
        _deposit(id="deposit-2", deposit_amount=80000, status="approved"),
        _deposit(
            id="deposit-3",
            outlet_id="2",
            outlet_name="Outlet B",
            deposit_amount=50000,
            status="pending_review",
            variance_amount=70000,
        ),
    ]

    rows = _build_outlet_breakdown(deposits)

    assert len(rows) == 2
    outlet_a = next(row for row in rows if row.outlet_name == "Outlet A")
    outlet_b = next(row for row in rows if row.outlet_name == "Outlet B")

    assert outlet_a.total_reports == 2
    assert outlet_a.approved == 1
    assert outlet_a.pending_review == 1
    assert outlet_b.discrepancy_count == 1


def test_finance_daily_trend_covers_requested_days(monkeypatch):
    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 8, 2, 12, 0, tzinfo=timezone.utc)

    monkeypatch.setattr("app.modules.finance_handoff.api.datetime", FixedDateTime)

    deposits = [
        _deposit(business_date="2026-08-02", deposit_amount=10000),
        _deposit(id="d2", business_date="2026-08-01", deposit_amount=20000, status="approved"),
    ]

    points = _build_daily_trend(deposits, days=3)

    assert len(points) == 3
    assert points[-1].reports_count == 1
    assert points[-1].deposit_amount == 10000
    assert points[-2].reports_count == 1
    assert points[-2].deposit_amount == 20000
