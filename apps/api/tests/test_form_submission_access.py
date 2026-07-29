from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import form_submissions


def test_form_submission_allows_an_outlet_in_user_scope(monkeypatch):
    monkeypatch.setattr(
        form_submissions,
        "resolve_form_submission_scope",
        lambda _db, _user: ([7, 9], False),
    )

    form_submissions.ensure_form_submission_outlet_access(
        db=None,
        current_user=SimpleNamespace(email="crew@novaops.test"),
        outlet_id=9,
    )


def test_form_submission_rejects_an_outlet_outside_user_scope(monkeypatch):
    monkeypatch.setattr(
        form_submissions,
        "resolve_form_submission_scope",
        lambda _db, _user: ([7, 9], False),
    )

    with pytest.raises(HTTPException) as error:
        form_submissions.ensure_form_submission_outlet_access(
            db=None,
            current_user=SimpleNamespace(email="crew@novaops.test"),
            outlet_id=10,
        )

    assert error.value.status_code == 403
