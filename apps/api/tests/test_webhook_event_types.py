from app.modules.webhooks.schemas import WEBHOOK_EVENT_TYPES
from app.modules.webhooks.service import WebhookService


def test_webhook_event_types_include_assigned_and_schedule_published():
    assert "task.assigned" in WEBHOOK_EVENT_TYPES
    assert "schedule.published" in WEBHOOK_EVENT_TYPES


def test_webhook_service_accepts_new_event_types():
    service = WebhookService(db=None)  # type: ignore[arg-type]
    service._validate_events(["task.assigned", "schedule.published"])
