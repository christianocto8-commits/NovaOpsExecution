from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        self.host = (os.environ.get("SMTP_HOST") or "").strip()
        self.port = int(os.environ.get("SMTP_PORT", "587"))
        self.username = (os.environ.get("SMTP_USER") or "").strip()
        self.password = os.environ.get("SMTP_PASSWORD") or ""
        self.sender = (os.environ.get("SMTP_FROM") or "").strip()

    def is_configured(self) -> bool:
        return bool(self.host and self.sender)

    def send(self, to: str, subject: str, body: str) -> bool:
        recipient = to.strip()
        if not recipient:
            return False

        if not self.is_configured():
            logger.warning("SMTP not configured; skipping email to %s", recipient)
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.sender
        message["To"] = recipient
        message.set_content(body)

        try:
            with smtplib.SMTP(self.host, self.port, timeout=20) as client:
                if self.port == 587:
                    client.starttls()

                if self.username and self.password:
                    client.login(self.username, self.password)

                client.send_message(message)

            return True
        except Exception:
            logger.exception("Failed to send email to %s", recipient)
            return False
