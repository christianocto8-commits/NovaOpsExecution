from app.services.sms_service import is_sms_configured, send_sms


def test_sms_not_configured_by_default(monkeypatch):
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "")
    monkeypatch.setenv("TWILIO_FROM_NUMBER", "")

    from app.core.config import get_settings

    get_settings.cache_clear()

    assert is_sms_configured() is False
    assert send_sms(to_number="+6281234567890", body="Test") is False

    get_settings.cache_clear()


def test_sms_send_when_configured(monkeypatch):
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secret")
    monkeypatch.setenv("TWILIO_FROM_NUMBER", "+15551234567")

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert is_sms_configured() is True

    class FakeResponse:
        status = 201

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        "app.services.sms_service.urllib.request.urlopen",
        lambda *args, **kwargs: FakeResponse(),
    )

    assert send_sms(to_number="+6281234567890", body="Task overdue") is True
    get_settings.cache_clear()
