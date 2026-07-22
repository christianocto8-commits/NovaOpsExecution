from __future__ import annotations

import logging
import urllib.error
import urllib.parse
import urllib.request
from base64 import b64encode

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def is_sms_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    )


def send_sms(*, to_number: str, body: str) -> bool:
    settings = get_settings()
    if not is_sms_configured():
        return False

    normalized_to = to_number.strip()
    if not normalized_to:
        return False

    account_sid = settings.twilio_account_sid
    auth_token = settings.twilio_auth_token
    from_number = settings.twilio_from_number

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urllib.parse.urlencode(
        {
            "To": normalized_to,
            "From": from_number,
            "Body": body[:1600],
        }
    ).encode("utf-8")

    credentials = b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    request_obj = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request_obj, timeout=15) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.warning("Twilio SMS failed for %s: %s", normalized_to, detail)
        return False
    except Exception as exc:
        logger.warning("Twilio SMS failed for %s: %s", normalized_to, exc)
        return False
