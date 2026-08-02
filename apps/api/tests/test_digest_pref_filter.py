"""Digest recipients must honor per-user email/digest preferences."""

from types import SimpleNamespace
from uuid import uuid4

from app.services import digest_email


def test_resolve_digest_recipients_skips_disabled_prefs(monkeypatch):
    users = [
        SimpleNamespace(id=uuid4(), email="enabled@example.com", is_active=True),
        SimpleNamespace(id=uuid4(), email="disabled@example.com", is_active=True),
    ]

    monkeypatch.setattr(
        digest_email,
        "get_workspace_settings",
        lambda _db: SimpleNamespace(scheduled_report_audience="owner-and-admin"),
    )

    calls = {"n": 0}

    def scalars(_statement):
        calls["n"] += 1
        if calls["n"] == 1:
            return SimpleNamespace(all=lambda: [uuid4()])
        return SimpleNamespace(all=lambda: users)

    db = SimpleNamespace(scalars=scalars)

    prefs = {
        str(users[0].id): {"email_enabled": True, "digest_enabled": True},
        str(users[1].id): {"email_enabled": True, "digest_enabled": False},
    }

    monkeypatch.setattr(
        digest_email,
        "get_user_settings",
        lambda _db, user_id, _ns, defaults: prefs.get(str(user_id), defaults),
    )

    recipients = digest_email._resolve_digest_recipients(db)
    assert recipients == ["enabled@example.com"]
