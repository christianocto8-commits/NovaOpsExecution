from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings
from app.models.execution_session import ExecutionSession
from app.models.outlet import Outlet
from app.models.task import Task
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OWNER_ROLE
from app.services.compliance_analytics import get_top_failed_checklist_items
from app.services.email_service import EmailService
from app.services.user_settings_store import get_user_settings
from app.services.workspace_settings import get_workspace_settings

DIGEST_LAST_SENT_KEY = "digest_last_sent"
NOTIFICATION_PREFS_NAMESPACE = "notification_prefs"
DEFAULT_NOTIFICATION_PREFS = {
    "email_enabled": True,
    "digest_enabled": False,
}


def _get_last_digest_sent_at(db: Session) -> datetime | None:
    row = db.query(AppSettings).filter(AppSettings.key == DIGEST_LAST_SENT_KEY).first()
    if not row or not row.payload:
        return None

    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return None

    raw = payload.get("sent_at")
    if not isinstance(raw, str):
        return None

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _mark_digest_sent(db: Session) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == DIGEST_LAST_SENT_KEY).first()
    payload = json.dumps({"sent_at": datetime.now(timezone.utc).isoformat()})

    if row:
        row.payload = payload
    else:
        row = AppSettings(key=DIGEST_LAST_SENT_KEY, payload=payload)
        db.add(row)

    db.commit()


def should_send_digest(db: Session, *, force: bool = False) -> tuple[bool, str]:
    settings = get_workspace_settings(db)

    if not settings.email_notifications:
        return False, "Email notifications disabled"

    if force:
        return True, "Forced send"

    frequency = (settings.digest_frequency or "daily").strip().lower()
    last_sent = _get_last_digest_sent_at(db)
    now = datetime.now(timezone.utc)

    if last_sent is None:
        return True, "First digest"

    elapsed = now - last_sent.astimezone(timezone.utc)

    if frequency == "weekly":
        if elapsed >= timedelta(days=7):
            return True, "Weekly interval reached"
        return False, "Weekly digest already sent recently"

    if elapsed >= timedelta(hours=20):
        return True, "Daily interval reached"

    return False, "Daily digest already sent recently"


def _resolve_digest_recipients(db: Session) -> list[str]:
    settings = get_workspace_settings(db)
    audience = (settings.scheduled_report_audience or "owner-and-admin").strip().lower()

    role_slugs = [OWNER_ROLE, ADMIN_ROLE]
    if audience == "owner-and-admin-and-area":
        role_slugs.append(AREA_MANAGER_ROLE)

    role_ids = db.scalars(select(Role.id).where(Role.slug.in_(role_slugs))).all()
    if not role_ids:
        return []

    users = db.scalars(
        select(IdentityUser).where(
            IdentityUser.is_active.is_(True),
            IdentityUser.role_id.in_(role_ids),
        )
    ).all()

    emails: list[str] = []
    seen: set[str] = set()

    for user in users:
        email = (user.email or "").strip().lower()
        if not email or email in seen:
            continue

        prefs = get_user_settings(
            db,
            user.id,
            NOTIFICATION_PREFS_NAMESPACE,
            DEFAULT_NOTIFICATION_PREFS,
        )
        if not bool(prefs.get("email_enabled", True)):
            continue
        if not bool(prefs.get("digest_enabled", False)):
            continue

        seen.add(email)
        emails.append(user.email.strip())

    return emails


def _build_outlet_ranking(db: Session, *, days: int = 7) -> list[dict]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    sessions = (
        db.query(ExecutionSession, Task, Outlet)
        .join(Task, ExecutionSession.task_id == Task.id)
        .join(Outlet, Task.outlet_id == Outlet.id)
        .filter(
            ExecutionSession.status == "completed",
            ExecutionSession.submitted_at.isnot(None),
            ExecutionSession.submitted_at >= since,
        )
        .all()
    )

    outlet_scores: dict[str, list[int]] = {}

    for session, _task, outlet in sessions:
        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        checklist = answers.get("_checklist")
        if not isinstance(checklist, dict):
            continue

        try:
            score = round(float(checklist.get("score")))
        except (TypeError, ValueError):
            continue

        outlet_scores.setdefault(outlet.name, []).append(score)

    ranking = [
        {
            "outlet": outlet_name,
            "score": round(sum(scores) / len(scores)),
            "submissions": len(scores),
        }
        for outlet_name, scores in outlet_scores.items()
    ]

    return sorted(ranking, key=lambda row: row["score"], reverse=True)


def _build_digest_summary(db: Session, *, days: int = 7) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    sessions = (
        db.query(ExecutionSession)
        .filter(
            ExecutionSession.status == "completed",
            ExecutionSession.submitted_at.isnot(None),
            ExecutionSession.submitted_at >= since,
        )
        .all()
    )

    scores: list[int] = []
    pass_count = 0

    for session in sessions:
        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        checklist = answers.get("_checklist")
        if not isinstance(checklist, dict):
            continue

        try:
            score = round(float(checklist.get("score")))
        except (TypeError, ValueError):
            continue

        scores.append(score)
        if checklist.get("status") == "pass":
            pass_count += 1

    avg_score = round(sum(scores) / len(scores)) if scores else 0
    pass_rate = round((pass_count / len(scores)) * 100) if scores else 0

    return {
        "days": days,
        "submissions": len(scores),
        "avg_score": avg_score,
        "pass_rate": pass_rate,
    }


def build_digest_email_body(db: Session, *, days: int = 7) -> str:
    settings = get_workspace_settings(db)
    summary = _build_digest_summary(db, days=days)
    failed_items = get_top_failed_checklist_items(db, limit=5, days=days, all_outlets=True)
    outlet_ranking = _build_outlet_ranking(db, days=days)[:5]

    lines = [
        f"Ringkasan Compliance NovaOps ({summary['days']} hari terakhir)",
        "",
        f"Rata-rata skor checklist: {summary['avg_score']}%",
        f"Tingkat lulus: {summary['pass_rate']}%",
        f"Total submission: {summary['submissions']}",
        f"Ambang lulus workspace: {settings.pass_threshold}%",
        "",
        "Top item gagal:",
    ]

    if failed_items:
        for item in failed_items:
            lines.append(f"- {item['label']}: {item['failure_count']}x ({item['sample_reason']})")
    else:
        lines.append("- Tidak ada item gagal pada periode ini")

    lines.extend(["", "Ranking outlet (skor rata-rata):"])

    if outlet_ranking:
        for index, row in enumerate(outlet_ranking, start=1):
            lines.append(
                f"{index}. {row['outlet']} — {row['score']}% ({row['submissions']} submission)"
            )
    else:
        lines.append("- Belum ada data submission")

    lines.extend(
        [
            "",
            "Buka dashboard compliance untuk detail lengkap.",
        ]
    )

    return "\n".join(lines)


def send_compliance_digest(db: Session, *, force: bool = False) -> dict:
    should_send, reason = should_send_digest(db, force=force)
    if not should_send:
        return {
            "sent": False,
            "reason": reason,
            "recipients": 0,
            "delivered": 0,
        }

    recipients = _resolve_digest_recipients(db)
    if not recipients:
        return {
            "sent": False,
            "reason": "No digest recipients configured",
            "recipients": 0,
            "delivered": 0,
        }

    settings = get_workspace_settings(db)
    frequency = (settings.digest_frequency or "daily").strip().lower()
    period_days = 7 if frequency == "weekly" else 7
    body = build_digest_email_body(db, days=period_days)
    subject = (
        "NovaOps Weekly Compliance Digest"
        if frequency == "weekly"
        else "NovaOps Daily Compliance Digest"
    )

    email_service = EmailService()
    delivered = 0

    for recipient in recipients:
        if email_service.send(recipient, subject, body):
            delivered += 1

    if delivered > 0:
        _mark_digest_sent(db)

    return {
        "sent": delivered > 0,
        "reason": reason,
        "recipients": len(recipients),
        "delivered": delivered,
    }
