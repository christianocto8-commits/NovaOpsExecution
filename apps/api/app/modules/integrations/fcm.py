from __future__ import annotations

from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[3]
WEB_ANDROID_APP = API_ROOT.parent / "web" / "android" / "app"


def is_fcm_configured() -> bool:
    """True when a real google-services.json is present (not just the example file)."""
    services_file = WEB_ANDROID_APP / "google-services.json"
    example_file = WEB_ANDROID_APP / "google-services.json.example"

    if not services_file.is_file():
        return False

    if example_file.is_file() and services_file.read_bytes() == example_file.read_bytes():
        return False

    return services_file.stat().st_size > 32
