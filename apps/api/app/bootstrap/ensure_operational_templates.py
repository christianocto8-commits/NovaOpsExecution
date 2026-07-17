from __future__ import annotations

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.task_schedule import TaskSchedule
from app.models.user import User
from app.modules.identity.models import Outlet as IdentityOutlet, User as IdentityUser
from app.modules.tasks.identity_bridge import (
    get_default_identity_outlet,
    get_or_create_legacy_outlet,
    sync_legacy_user,
)

DEFAULT_OUTLET_CODE = "HQ"

OPERATIONAL_TEMPLATES: list[dict] = [
    {
        "title": "Opening Checklist",
        "description": "Daily outlet opening procedures before service starts.",
        "form_type": "opening",
        "fields": [
            {"label": "Store unlocked and lights on", "field_type": "yes_no", "is_required": True, "sort_order": 0},
            {"label": "Equipment pre-check completed", "field_type": "yes_no", "is_required": True, "sort_order": 1},
            {"label": "Opening cash float (IDR)", "field_type": "money_amount", "is_required": True, "sort_order": 2},
            {"label": "Opening photo evidence", "field_type": "photo", "is_required": True, "sort_order": 3},
            {"label": "Opening notes", "field_type": "textarea", "is_required": False, "sort_order": 4},
        ],
        "schedule": {
            "title": "Daily Opening Checklist",
            "recurrence": "daily",
            "shifts": ["morning"],
            "due_time": "07:00",
            "priority": "high",
        },
    },
    {
        "title": "Food Safety & Temperature Log",
        "description": "Monitor critical food safety temperatures throughout the day.",
        "form_type": "food_safety",
        "fields": [
            {"label": "Walk-in cooler temperature (°C)", "field_type": "number", "is_required": True, "sort_order": 0},
            {"label": "Hot holding temperature (°C)", "field_type": "number", "is_required": True, "sort_order": 1},
            {"label": "Sanitizer concentration OK", "field_type": "yes_no", "is_required": True, "sort_order": 2},
            {"label": "Temperature log photo", "field_type": "photo", "is_required": False, "sort_order": 3},
            {"label": "Corrective action taken", "field_type": "textarea", "is_required": False, "sort_order": 4},
        ],
        "schedule": {
            "title": "Food Safety Temperature Log",
            "recurrence": "daily",
            "shifts": ["morning", "evening"],
            "due_time": "10:00",
            "priority": "urgent",
        },
    },
    {
        "title": "Cleaning & Sanitation",
        "description": "Daily cleaning checklist for front and back of house.",
        "form_type": "cleaning",
        "fields": [
            {"label": "Dining area cleaned", "field_type": "yes_no", "is_required": True, "sort_order": 0},
            {"label": "Restroom sanitized", "field_type": "yes_no", "is_required": True, "sort_order": 1},
            {"label": "Kitchen surfaces sanitized", "field_type": "yes_no", "is_required": True, "sort_order": 2},
            {"label": "Cleaning completion photo", "field_type": "photo", "is_required": False, "sort_order": 3},
        ],
        "schedule": {
            "title": "Daily Cleaning & Sanitation",
            "recurrence": "daily",
            "shifts": ["evening"],
            "due_time": "20:00",
            "priority": "medium",
        },
    },
    {
        "title": "Closing Checklist",
        "description": "End-of-day closing procedures and cash reconciliation.",
        "form_type": "closing",
        "fields": [
            {"label": "All equipment powered down", "field_type": "yes_no", "is_required": True, "sort_order": 0},
            {"label": "Closing cash count (IDR)", "field_type": "money_amount", "is_required": True, "sort_order": 1},
            {"label": "Waste disposal completed", "field_type": "yes_no", "is_required": True, "sort_order": 2},
            {"label": "Responsible person", "field_type": "responsible_person", "is_required": True, "sort_order": 3},
            {"label": "Closing signature", "field_type": "signature", "is_required": True, "sort_order": 4},
        ],
        "schedule": {
            "title": "Daily Closing Checklist",
            "recurrence": "daily",
            "shifts": ["midnight"],
            "due_time": "22:00",
            "priority": "high",
        },
    },
]


def _get_legacy_creator(db) -> User | None:
    settings = get_settings()
    email = (settings.bootstrap_admin_email or "admin@novaops.com").strip().lower()

    identity_user = db.scalar(select(IdentityUser).where(IdentityUser.email == email))
    if identity_user:
        identity_outlet = get_default_identity_outlet(identity_user)
        legacy_outlet = (
            get_or_create_legacy_outlet(db, identity_outlet) if identity_outlet else None
        )
        return sync_legacy_user(db, identity_user, legacy_outlet)

    return db.scalar(select(User).where(User.email == email))


def _get_outlet_ids(db) -> list[str]:
    outlets = db.scalars(select(IdentityOutlet)).all()
    return [str(outlet.id) for outlet in outlets]


def ensure_operational_templates() -> None:
    settings = get_settings()
    if not settings.bootstrap_admin_enabled:
        return

    db = SessionLocal()
    try:
        creator = _get_legacy_creator(db)
        if creator is None:
            return

        db.flush()

        outlet_ids = _get_outlet_ids(db)
        if not outlet_ids:
            return

        for spec in OPERATIONAL_TEMPLATES:
            existing = db.scalar(
                select(FormTemplate).where(FormTemplate.title == spec["title"])
            )
            if existing:
                template = existing
            else:
                template = FormTemplate(
                    title=spec["title"],
                    description=spec["description"],
                    form_type=spec["form_type"],
                    created_by=creator.id,
                    is_active=True,
                )
                db.add(template)
                db.flush()

                for field_spec in spec["fields"]:
                    db.add(FormField(form_template_id=template.id, **field_spec))

            schedule_spec = spec["schedule"]
            schedule_title = schedule_spec["title"]
            existing_schedule = db.scalar(
                select(TaskSchedule).where(TaskSchedule.title == schedule_title)
            )
            if existing_schedule:
                continue

            db.add(
                TaskSchedule(
                    title=schedule_title,
                    description=spec["description"],
                    form_template_id=template.id,
                    priority=schedule_spec["priority"],
                    recurrence=schedule_spec["recurrence"],
                    shifts_json=schedule_spec["shifts"],
                    outlet_ids_json=outlet_ids,
                    due_time=schedule_spec["due_time"],
                    weekly_publish_day=None,
                    auto_publish=True,
                    is_active=True,
                    created_by=creator.id,
                )
            )

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
