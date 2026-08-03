from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

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
            {"label": "Opening cash float (IDR)", "field_type": "number", "is_required": True, "sort_order": 2},
            {"label": "Opening photo evidence", "field_type": "photo", "is_required": True, "sort_order": 3},
            {"label": "Opening notes", "field_type": "textarea", "is_required": False, "sort_order": 4},
        ],
        "schedule": {
            "title": "Daily Opening Checklist",
            "recurrence": "daily",
            "publish_time": "06:00",
            "due_time": "08:00",
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
            "publish_time": "09:00",
            "due_time": "17:00",
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
            "publish_time": "18:00",
            "due_time": "21:00",
            "priority": "medium",
        },
    },
    {
        "title": "Closing Checklist",
        "description": "End-of-day closing procedures and cash reconciliation.",
        "form_type": "closing",
        "fields": [
            {"label": "All equipment powered down", "field_type": "yes_no", "is_required": True, "sort_order": 0},
            {"label": "Closing cash count (IDR)", "field_type": "number", "is_required": True, "sort_order": 1},
            {"label": "Waste disposal completed", "field_type": "yes_no", "is_required": True, "sort_order": 2},
            {"label": "Responsible person", "field_type": "responsible_person", "is_required": True, "sort_order": 3},
            {"label": "Closing signature", "field_type": "signature", "is_required": True, "sort_order": 4},
        ],
        "schedule": {
            "title": "Daily Closing Checklist",
            "recurrence": "daily",
            "publish_time": "20:00",
            "due_time": "23:00",
            "priority": "high",
        },
    },
    {
        "title": "Store Visit / Field Audit",
        "description": "Manager walkthrough for brand standards, food safety, and guest experience. Failed items auto-create CAPA.",
        "form_type": "audit",
        "fields": [
            {
                "label": "Exterior & signage presentable",
                "field_type": "yes_no",
                "is_required": True,
                "sort_order": 0,
            },
            {
                "label": "Guest area clean and welcoming",
                "field_type": "yes_no",
                "is_required": True,
                "sort_order": 1,
            },
            {
                "label": "Food safety standards met",
                "field_type": "yes_no",
                "is_required": True,
                "sort_order": 2,
            },
            {
                "label": "Team in proper uniform",
                "field_type": "yes_no",
                "is_required": True,
                "sort_order": 3,
            },
            {
                "label": "Service speed meets standard",
                "field_type": "yes_no",
                "is_required": True,
                "sort_order": 4,
            },
            {
                "label": "Finding photo evidence",
                "field_type": "photo",
                "is_required": True,
                "sort_order": 5,
            },
            {
                "label": "Visit notes / coaching points",
                "field_type": "textarea",
                "is_required": False,
                "sort_order": 6,
            },
        ],
    },
]


def _get_legacy_creator(db: Session) -> User | None:
    settings = get_settings()
    email = (settings.bootstrap_admin_email or "admin@novaops.com").strip().lower()

    identity_user = db.scalar(select(IdentityUser).where(IdentityUser.email == email))
    if identity_user:
        return resolve_template_creator(db, identity_user)

    return db.scalar(select(User).where(User.email == email))


def resolve_template_creator(db: Session, identity_user: IdentityUser) -> User | None:
    identity_outlet = get_default_identity_outlet(identity_user)
    legacy_outlet = (
        get_or_create_legacy_outlet(db, identity_outlet) if identity_outlet else None
    )
    return sync_legacy_user(db, identity_user, legacy_outlet)


def _get_outlet_ids(db: Session) -> list[str]:
    outlets = db.scalars(select(IdentityOutlet)).all()
    return [str(outlet.id) for outlet in outlets]


def _normalize_legacy_money_fields(db: Session, template: FormTemplate) -> None:
    """Align legacy money widgets with Zenput-style number fields."""
    legacy_types = {"money_amount", "money_denomination"}
    fields = db.scalars(
        select(FormField).where(FormField.form_template_id == template.id)
    ).all()

    for field in fields:
        if field.field_type not in legacy_types:
            continue

        field.field_type = "number"
        if field.help_text in {"Penghitungan Setoran", "Laporan Penjualan"}:
            field.help_text = None


def install_operational_templates(
    db: Session,
    *,
    creator: User | None = None,
) -> dict:
    """Idempotently install starter form templates and daily schedules."""
    resolved_creator = creator or _get_legacy_creator(db)
    if resolved_creator is None:
        return {
            "ok": False,
            "message": "Tidak ada user admin untuk membuat starter pack.",
            "templates_created": [],
            "templates_existing": [],
            "schedules_created": [],
            "schedules_existing": [],
            "outlet_count": 0,
        }

    db.flush()
    outlet_ids = _get_outlet_ids(db)

    templates_created: list[str] = []
    templates_existing: list[str] = []
    schedules_created: list[str] = []
    schedules_existing: list[str] = []

    for spec in OPERATIONAL_TEMPLATES:
        existing = db.scalar(select(FormTemplate).where(FormTemplate.title == spec["title"]))
        if existing:
            template = existing
            templates_existing.append(spec["title"])
            _normalize_legacy_money_fields(db, template)
        else:
            template = FormTemplate(
                title=spec["title"],
                description=spec["description"],
                form_type=spec["form_type"],
                created_by=resolved_creator.id,
                is_active=True,
            )
            db.add(template)
            db.flush()

            for field_spec in spec["fields"]:
                db.add(FormField(form_template_id=template.id, **field_spec))
            templates_created.append(spec["title"])

        schedule_spec = spec.get("schedule")
        if not schedule_spec:
            continue

        if not outlet_ids:
            continue

        schedule_title = schedule_spec["title"]
        existing_schedule = db.scalar(
            select(TaskSchedule).where(TaskSchedule.title == schedule_title)
        )
        if existing_schedule:
            schedules_existing.append(schedule_title)
            continue

        db.add(
            TaskSchedule(
                title=schedule_title,
                description=spec["description"],
                form_template_id=template.id,
                priority=schedule_spec["priority"],
                recurrence=schedule_spec["recurrence"],
                shifts_json=[],
                outlet_ids_json=outlet_ids,
                publish_time=schedule_spec.get("publish_time", "09:00"),
                due_time=schedule_spec["due_time"],
                weekly_publish_day=None,
                auto_publish=True,
                is_active=True,
                created_by=resolved_creator.id,
            )
        )
        schedules_created.append(schedule_title)

    message_parts = [
        f"{len(templates_created)} template baru",
        f"{len(schedules_created)} jadwal baru",
    ]
    if not outlet_ids and any(spec.get("schedule") for spec in OPERATIONAL_TEMPLATES):
        message_parts.append("jadwal ditunda sampai outlet tersedia")

    return {
        "ok": True,
        "message": "Starter pack terpasang: " + ", ".join(message_parts) + ".",
        "templates_created": templates_created,
        "templates_existing": templates_existing,
        "schedules_created": schedules_created,
        "schedules_existing": schedules_existing,
        "outlet_count": len(outlet_ids),
    }


def ensure_operational_templates() -> None:
    settings = get_settings()
    if not settings.bootstrap_admin_enabled:
        return

    db = SessionLocal()
    try:
        result = install_operational_templates(db)
        if result.get("ok"):
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
