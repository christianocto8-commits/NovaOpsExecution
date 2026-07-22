"""FCM configuration detection for integrations status."""

from pathlib import Path

from app.modules.integrations.fcm import is_fcm_configured


def test_fcm_not_configured_without_google_services():
    assert is_fcm_configured() is False


def test_fcm_detects_real_google_services(tmp_path, monkeypatch):
    app_dir = tmp_path / "android" / "app"
    app_dir.mkdir(parents=True)

    services = app_dir / "google-services.json"
    services.write_text('{"project_info":{"project_id":"live-project"}}', encoding="utf-8")

    example = app_dir / "google-services.json.example"
    example.write_text('{"project_info":{"project_id":"example"}}', encoding="utf-8")

    monkeypatch.setattr(
        "app.modules.integrations.fcm.WEB_ANDROID_APP",
        app_dir,
    )

    assert is_fcm_configured() is True
