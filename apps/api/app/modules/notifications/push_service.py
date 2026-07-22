from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.notifications.push_repository import PushSubscriptionRepository
from app.modules.notifications.device_push_repository import DevicePushTokenRepository


class PushNotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PushSubscriptionRepository(db)
        self.device_repository = DevicePushTokenRepository(db)
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.vapid_public_key and self.settings.vapid_private_key)

    def send_to_user(
        self,
        user_id: UUID,
        *,
        title: str,
        body: str,
        url: str | None = None,
        data: dict | None = None,
    ) -> dict[str, int]:
        if not self.is_configured:
            return {"attempted": 0, "sent": 0, "failed": 0, "removed": 0}

        subscriptions = self.repository.list_for_user(user_id)
        device_tokens = self.device_repository.list_for_user(user_id)
        result = {
            "attempted": len(subscriptions),
            "sent": 0,
            "failed": 0,
            "removed": 0,
            "device_tokens": len(device_tokens),
        }

        if not subscriptions:
            return result

        payload = {
            "title": title,
            "body": body,
            "url": url or "/dashboard/tasks",
            "data": data or {},
        }

        try:
            from pywebpush import WebPushException, webpush
        except ImportError:
            result["failed"] = len(subscriptions)
            return result

        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh,
                            "auth": subscription.auth,
                        },
                    },
                    data=json.dumps(payload),
                    vapid_private_key=self.settings.vapid_private_key,
                    vapid_claims={"sub": self.settings.vapid_subject},
                )
                result["sent"] += 1
            except WebPushException as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)

                if status_code in {404, 410}:
                    self.repository.delete(subscription)
                    result["removed"] += 1
                else:
                    result["failed"] += 1
            except Exception:
                result["failed"] += 1

        return result
