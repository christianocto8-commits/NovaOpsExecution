from app.services.email_service import EmailService


def test_email_service_noop_when_smtp_not_configured(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_FROM", raising=False)

    service = EmailService()

    assert service.is_configured() is False
    assert service.send("user@example.com", "Subject", "Body") is False
