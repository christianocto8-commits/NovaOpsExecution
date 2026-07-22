"""Tests for webhook delivery logging and retry."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.webhook_dispatcher import _deliver_with_retry, dispatch_webhook_event


class FakeSession:
    def __init__(self) -> None:
        self.records: list = []

    def add(self, record) -> None:
        self.records.append(record)

    def commit(self) -> None:
        return None


@pytest.fixture
def subscription():
    return SimpleNamespace(
        id=uuid4(),
        url="https://example.com/hooks/novaops",
        secret="test-secret-key",
    )


def test_deliver_with_retry_logs_success(subscription, monkeypatch):
    db = FakeSession()

    def fake_post(url: str, secret: str, payload: dict) -> int:
        return 200

    monkeypatch.setattr("app.services.webhook_dispatcher._post_webhook", fake_post)

    delivered = _deliver_with_retry(
        db,  # type: ignore[arg-type]
        subscription=subscription,
        event_type="task.completed",
        envelope={"event": "task.completed", "data": {"task_id": 1}},
    )

    assert delivered is True
    assert len(db.records) == 1
    assert db.records[0].status == "delivered"
    assert db.records[0].attempt_count == 1


def test_deliver_with_retry_retries_then_fails(subscription, monkeypatch):
    db = FakeSession()
    calls = {"count": 0}

    def fake_post(url: str, secret: str, payload: dict) -> int:
        calls["count"] += 1
        raise RuntimeError("connection refused")

    monkeypatch.setattr("app.services.webhook_dispatcher._post_webhook", fake_post)
    monkeypatch.setattr("app.services.webhook_dispatcher.time.sleep", lambda _: None)

    delivered = _deliver_with_retry(
        db,  # type: ignore[arg-type]
        subscription=subscription,
        event_type="task.completed",
        envelope={"event": "task.completed", "data": {"task_id": 2}},
    )

    assert delivered is False
    assert calls["count"] == 2
    assert len(db.records) == 1
    assert db.records[0].status == "failed"
    assert db.records[0].attempt_count == 2


def test_dispatch_webhook_event_skips_when_disabled(db, monkeypatch):
    from app.schemas.settings import SettingsResponse

    monkeypatch.setattr(
        "app.services.webhook_dispatcher.get_workspace_settings",
        lambda _db: SettingsResponse(webhook_enabled=False),
    )

    called = {"value": False}

    def fake_deliver(*args, **kwargs):
        called["value"] = True
        return True

    monkeypatch.setattr("app.services.webhook_dispatcher._deliver_with_retry", fake_deliver)

    delivered = dispatch_webhook_event(
        db,
        event_type="task.completed",
        payload={"task_id": 99},
    )

    assert delivered == 0
    assert called["value"] is False
