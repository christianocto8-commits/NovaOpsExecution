"""Unit tests for identity bridge utilities.

These tests use lightweight fakes (not a real DB) to verify the scoping
logic in get_accessible_identity_outlets without relying on DATABASE_URL.
"""

from unittest.mock import MagicMock

from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.tasks.identity_bridge import get_accessible_identity_outlets


def _make_role(slug: str) -> MagicMock:
    role = MagicMock(spec=Role)
    role.slug = slug
    return role


def _make_outlet(code: str) -> MagicMock:
    outlet = MagicMock(spec=IdentityOutlet)
    outlet.code = code
    return outlet


def _make_user(
    role_slug: str,
    assigned_outlets: list[IdentityOutlet] | None = None,
    region_id=None,
    district_id=None,
    outlet=None,
) -> MagicMock:
    user = MagicMock(spec=IdentityUser)
    user.role = _make_role(role_slug)
    user.assigned_outlets = assigned_outlets or []
    user.region_id = region_id
    user.district_id = district_id
    user.outlet = outlet
    user.email = f"{role_slug}@example.com"
    return user


class TestGetAccessibleIdentityOutlets:
    """Tests for the get_accessible_identity_outlets function."""

    def test_owner_gets_all_outlets(self):
        db = MagicMock()
        all_outlets = [_make_outlet("O001"), _make_outlet("O002")]
        db.query.return_value.order_by.return_value.all.return_value = all_outlets

        user = _make_user("owner")
        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is True
        assert result == all_outlets

    def test_admin_gets_all_outlets(self):
        db = MagicMock()
        all_outlets = [_make_outlet("O001")]
        db.query.return_value.order_by.return_value.all.return_value = all_outlets

        user = _make_user("admin")
        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is True
        assert len(result) == 1

    def test_regional_manager_with_assignments(self):
        db = MagicMock()
        assigned = [_make_outlet("R001")]
        user = _make_user("regional_manager", assigned_outlets=assigned)

        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is False
        assert result == assigned

    def test_regional_manager_without_assignments_uses_region(self):
        db = MagicMock()
        outlets = [_make_outlet("R001"), _make_outlet("R002")]
        query_chain = db.query.return_value.filter.return_value.order_by.return_value
        query_chain.all.return_value = outlets

        user = _make_user("regional_manager", region_id=123)
        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is False
        assert len(result) == 2

    def test_crew_user_returns_only_default_outlet(self):
        db = MagicMock()
        outlet_a = _make_outlet("O001")
        outlet_b = _make_outlet("O002")
        user = _make_user("crew", assigned_outlets=[outlet_a], outlet=outlet_b)

        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is False
        assert len(result) == 1
        assert result[0] == outlet_b

    def test_finance_head_office_gets_all_outlets(self):
        db = MagicMock()
        all_outlets = [_make_outlet("O001")]
        db.query.return_value.order_by.return_value.all.return_value = all_outlets

        user = _make_user("finance_head_office")
        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is True

    def test_finance_head_office_restricted_for_operational_context(self):
        user = _make_user("finance_head_office")

        result, full_access = get_accessible_identity_outlets(
            db=MagicMock(),
            identity_user=user,
            include_head_office_full_access=False,
        )

        assert full_access is False
        assert result == []

    def test_district_manager_without_assignments_returns_empty(self):
        db = MagicMock()
        user = _make_user("district_manager", district_id=None)

        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is False
        assert result == []

    def test_user_without_role_returns_default_outlet(self):
        db = MagicMock()
        outlet = _make_outlet("DEFAULT")
        user = _make_user("unknown_role", outlet=outlet)

        result, full_access = get_accessible_identity_outlets(db, user)

        assert full_access is False
        assert len(result) == 1
        assert result[0] == outlet
