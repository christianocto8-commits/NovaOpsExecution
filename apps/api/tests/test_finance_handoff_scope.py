from types import SimpleNamespace

from app.modules.finance_handoff.api import (
    _user_has_outlet_access,
    create_finance_deposit_from_form_submission,
)
from app.modules.finance_handoff.schemas import FinanceShiftDeposit


def _identity_user(*, primary_outlet_id=None, assigned_outlet_ids=()):
    return SimpleNamespace(
        outlet_id=primary_outlet_id,
        assigned_outlets=[SimpleNamespace(id=outlet_id) for outlet_id in assigned_outlet_ids],
    )


def test_finance_user_can_access_primary_outlet():
    outlet = SimpleNamespace(id="outlet-a")
    user = _identity_user(primary_outlet_id="outlet-a")

    assert _user_has_outlet_access(user, outlet)


def test_finance_user_can_access_assigned_outlet():
    outlet = SimpleNamespace(id="outlet-b")
    user = _identity_user(assigned_outlet_ids=("outlet-a", "outlet-b"))

    assert _user_has_outlet_access(user, outlet)


def test_finance_user_cannot_access_unassigned_or_unknown_outlet():
    user = _identity_user(primary_outlet_id="outlet-a")

    assert not _user_has_outlet_access(user, SimpleNamespace(id="outlet-b"))
    assert not _user_has_outlet_access(user, None)


def test_finance_deposit_remains_compatible_with_legacy_records():
    deposit = FinanceShiftDeposit(
        id="deposit-1",
        business_date="2026-07-31",
        shift_name="morning",
        submitted_at="2026-07-31T08:00:00Z",
    )

    assert deposit.form_submission_id is None


def test_finance_conversion_is_idempotent_for_a_form_submission(monkeypatch):
    stored_deposit = FinanceShiftDeposit(
        id="deposit-1",
        form_submission_id=42,
        business_date="2026-07-31",
        shift_name="evening",
        submitted_at="2026-07-31T17:00:00Z",
    ).model_dump(mode="json")
    monkeypatch.setattr(
        "app.modules.finance_handoff.api._load_deposits",
        lambda _db: [stored_deposit],
    )

    result = create_finance_deposit_from_form_submission(
        db=None,
        submission=SimpleNamespace(id=42),
        template=SimpleNamespace(form_type="finance_shift_deposit"),
        submitted_by_legacy_user_id=7,
    )

    assert result is not None
    assert result.id == "deposit-1"
