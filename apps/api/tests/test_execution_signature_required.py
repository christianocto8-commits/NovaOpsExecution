"""Signature enforcement when workspace setting is enabled."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services import execution_validation


def test_signature_required_rejects_missing_signature(monkeypatch):
    monkeypatch.setattr(
        execution_validation,
        "get_workspace_settings",
        lambda _db: SimpleNamespace(
            note_required=False,
            evidence_required=False,
            photo_required_by_default=False,
            signature_required_by_default=True,
        ),
    )

    with pytest.raises(HTTPException) as exc:
        execution_validation.validate_task_execution_answers(
            db=None,
            answers_json={"temperature": "4"},
        )

    assert exc.value.status_code == 400
    assert "Tanda tangan" in str(exc.value.detail)


def test_signature_required_accepts_signature_answer(monkeypatch):
    monkeypatch.setattr(
        execution_validation,
        "get_workspace_settings",
        lambda _db: SimpleNamespace(
            note_required=False,
            evidence_required=False,
            photo_required_by_default=False,
            signature_required_by_default=True,
        ),
    )

    execution_validation.validate_task_execution_answers(
        db=None,
        answers_json={"signature": "data:image/png;base64,abc"},
    )
