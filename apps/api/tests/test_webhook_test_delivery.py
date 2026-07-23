"""Tests for webhook test delivery endpoint."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.services.webhook_dispatcher import send_test_webhook


class FakeSession:
    def __init__(self) -> None:
        self.records: list = []

    def add(self, record) -> None:
        self.records.append(record)

    def commit(self) -> None:
        return None


@pytest.fixture
def subscription():
    return type(
        "Subscription",
        (),
        {
            "id": uuid4(),
            "url": "https://example.com/hooks/novaops-test",
            "secret": "test-secret-key",
        },
    )()


def test_send_test_webhook_records_delivery(subscription, monkeypatch):
    db = FakeSession()

    def fake_deliver(db_arg, *, subscription, event_type, envelope):
        from types import SimpleNamespace

        db_arg.add(
            SimpleNamespace(
                http_status=200,
                error_message=None,
            )
        )
        return True

    def fake_list(db_arg, *, limit, subscription_id):
        from types import SimpleNamespace

        return [
            SimpleNamespace(
                http_status=200,
                error_message=None,
            )
        ]

    monkeypatch.setattr("app.services.webhook_dispatcher._deliver_with_retry", fake_deliver)
    monkeypatch.setattr("app.services.webhook_dispatcher.list_recent_deliveries", fake_list)

    delivered, http_status, error_message = send_test_webhook(db, subscription=subscription)

    assert delivered is True
    assert http_status == 200
    assert error_message is None


def test_webhook_test_endpoint(client, auth_headers, monkeypatch):
    webhook_id = uuid4()

    class FakeSubscription:
        id = webhook_id
        url = "https://example.com/hooks/novaops-test-endpoint"
        secret = "super-secret-webhook-key"

    monkeypatch.setattr(
        "app.modules.webhooks.api.WebhookService.get_webhook",
        lambda self, _webhook_id: FakeSubscription(),
    )
    monkeypatch.setattr(
        "app.modules.webhooks.api.send_test_webhook",
        lambda db, subscription: (True, 200, None),
    )

    response = client.post(
        f"/api/v1/webhooks/{webhook_id}/test",
        headers=auth_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["delivered"] is True
    assert payload["event_type"] == "webhook.test"
