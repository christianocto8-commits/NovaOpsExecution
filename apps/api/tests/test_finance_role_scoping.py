"""Finance Head Office sees all outlets; Finance Outlet stays assigned-scoped."""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://novaops:novaops@127.0.0.1:5433/novaops")

from types import SimpleNamespace
from uuid import uuid4

from app.modules.tasks.identity_bridge import get_accessible_identity_outlets


class _Query:
    def __init__(self, rows):
        self.rows = rows

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        return list(self.rows)


def test_finance_head_office_has_full_outlet_access():
    outlets = [SimpleNamespace(id=uuid4(), code="A"), SimpleNamespace(id=uuid4(), code="B")]
    db = SimpleNamespace(query=lambda *_args, **_kwargs: _Query(outlets))
    user = SimpleNamespace(
        role=SimpleNamespace(slug="finance_head_office"),
        assigned_outlets=[],
        outlet_id=None,
        outlet=None,
    )

    accessible, full_access = get_accessible_identity_outlets(db, user)

    assert full_access is True
    assert accessible == outlets


def test_finance_outlet_uses_assigned_outlets_only():
    assigned = [SimpleNamespace(id=uuid4(), code="OUT-1")]
    db = SimpleNamespace(query=lambda *_args, **_kwargs: _Query([]))
    user = SimpleNamespace(
        role=SimpleNamespace(slug="finance"),
        assigned_outlets=assigned,
        outlet_id=None,
        outlet=None,
    )

    accessible, full_access = get_accessible_identity_outlets(db, user)

    assert full_access is False
    assert accessible == assigned
