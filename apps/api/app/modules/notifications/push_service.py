from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.integrations.fcm import is_fcm_send_configured, send_fcm_to_tokens
from app.modules.notifications.device_push_repository import DevicePushTokenRepository
from app.modules.notifications.push_repository import PushSubscriptionRepository


class PushNotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PushSubscriptionRepository(db)
        self.device_repository = DevicePushTokenRepository(db)
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        vapid_ready = bool(self.settings.vapid_public_key and self.settings.vapid_private_key)
        return vapid_ready or is_fcm_send_configured()

    def send_to_user(
        self,
        user_id: UUID,
        *,
        title: str,
        body: str,
        url: str | None = None,
        data: dict | None = None,
    ) -> dict[str, int]:
        subscriptions = self.repository.list_for_user(user_id)
        device_tokens = self.device_repository.list_for_user(user_id)

        result = {
            "attempted": len(subscriptions) + len(device_tokens),
            "sent": 0,
            "failed": 0,
            "removed": 0,
            "device_tokens": len(device_tokens),
            "fcm_sent": 0,
            "fcm_failed": 0,
        }

        if not self.is_configured:
            return result

        payload = {
            "title": title,
            "body": body,
            "url": url or "/dashboard/tasks",
            "data": data or {},
        }

        if subscriptions and self.settings.vapid_public_key and self.settings.vapid_private_key:
            try:
                from pywebpush import WebPushException, webpush
            except ImportError:
                result["failed"] += len(subscriptions)
            else:
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

        if device_tokens and is_fcm_send_configured():
            fcm_result = send_fcm_to_tokens(
                [record.token for record in device_tokens],
                title=title,
                body=body,
                url=url,
                data=data,
            )
            result["fcm_sent"] = fcm_result["sent"]
            result["fcm_failed"] = fcm_result["failed"]
            result["sent"] += fcm_result["sent"]
            result["failed"] += fcm_result["failed"]

        return result
