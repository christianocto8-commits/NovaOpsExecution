from __future__ import annotations

import json
import threading
from pathlib import Path

from app.core.config import get_settings

_api_root = Path(__file__).resolve().parents[3]
_web_and_android_app = _api_root.parent / "web" / "android" / "app"
_firebase_lock = threading.Lock()


def is_fcm_client_configured() -> bool:
    """True when a real google-services.json is present (not just the example file)."""
    services_file = _web_and_android_app / "google-services.json"
    example_file = _web_and_android_app / "google-services.json.example"

    if not services_file.is_file():
        return False

    if example_file.is_file() and services_file.read_bytes() == example_file.read_bytes():
        return False

    return services_file.stat().st_size > 32


def is_fcm_send_configured() -> bool:
    settings = get_settings()
    if settings.firebase_credentials_json:
        return True

    if settings.firebase_credentials_path:
        return Path(settings.firebase_credentials_path).is_file()

    return False


def is_fcm_configured() -> bool:
    return is_fcm_client_configured()


def is_fcm_send_ready() -> bool:
    return is_fcm_client_configured() and is_fcm_send_configured()


def _load_firebase_credentials():
    settings = get_settings()

    if settings.firebase_credentials_json:
        return json.loads(settings.firebase_credentials_json)

    if settings.firebase_credentials_path:
        return json.loads(Path(settings.firebase_credentials_path).read_text(encoding="utf-8"))

    raise RuntimeError("Firebase credentials not configured")


def send_fcm_to_tokens(
    tokens: list[str],
    *,
    title: str,
    body: str,
    url: str | None = None,
    data: dict | None = None,
) -> dict[str, int]:
    result = {"attempted": len(tokens), "sent": 0, "failed": 0}

    if not tokens:
        return result

    if not is_fcm_send_configured():
        result["failed"] = len(tokens)
        return result

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError:
        result["failed"] = len(tokens)
        return result

    with _firebase_lock:
        if not firebase_admin._apps:
            try:
                firebase_admin.initialize_app(credentials.Certificate(_load_firebase_credentials()))
            except Exception:
                result["failed"] = len(tokens)
                return result

    payload_data = {"url": url or "/dashboard/tasks", **(data or {})}

    for token in tokens:
        try:
            messaging.send(
                messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={key: str(value) for key, value in payload_data.items()},
                    token=token,
                )
            )
            result["sent"] += 1
        except Exception:
            result["failed"] += 1

    return result


def get_fcm_setup_steps() -> list[str]:
    steps: list[str] = []
    if not is_fcm_client_configured():
        steps.append("Copy google-services.json to apps/web/android/app/")
    if not is_fcm_send_configured():
        steps.append("Set FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_JSON in API env")
    steps.append("npm run cap:sync and rebuild Android app")
    return steps
