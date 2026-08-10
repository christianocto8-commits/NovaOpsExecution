"""AI compliance guard ("satpam"): per-outlet compliance intelligence, anomaly
detection, and natural-language narrative + recommendations.

The LLM call is optional and provider-agnostic (OpenAI-compatible chat
completions via stdlib urllib). When no API key is configured, or the call
fails, the service degrades gracefully to deterministic rule-based narrative
so the scheduler job never breaks and never costs money.
"""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.models.outlet import Outlet
from app.models.task import Task
from app.services.workspace_settings import get_workspace_settings

COMPLIANCE_WINDOW_DAYS = 7


# --------------------------------------------------------------------------- #
# Intel: pure dataclasses + DB queries
# --------------------------------------------------------------------------- #

@dataclass
class OutletComplianceIntel:
    outlet_id: int
    outlet_name: str
    submissions: int = 0
    avg_score: int = 0
    pass_rate: int = 0
    overdue_tasks: int = 0
    expired_tasks: int = 0
    open_tasks: int = 0
    high_stalled_tasks: int = 0
    prev_avg_score: int | None = None
    anomaly_flags: list[str] = field(default_factory=list)

    @property
    def score_delta(self) -> int | None:
        if self.prev_avg_score is None:
            return None
        return self.avg_score - self.prev_avg_score


@dataclass
class ComplianceIntel:
    days: int
    generated_at: str
    outlets: list[OutletComplianceIntel] = field(default_factory=list)

    @property
    def total_outlets(self) -> int:
        return len(self.outlets)

    @property
    def outlets_with_anomaly(self) -> list[OutletComplianceIntel]:
        return [o for o in self.outlets if o.anomaly_flags]


def _checklist_score(session: ExecutionSession) -> int | None:
    answers = session.answers_json if isinstance(session.answers_json, dict) else {}
    checklist = answers.get("_checklist")
    if not isinstance(checklist, dict):
        return None
    try:
        return round(float(checklist.get("score")))
    except (TypeError, ValueError):
        return None


def _checklist_passed(session: ExecutionSession) -> bool:
    answers = session.answers_json if isinstance(session.answers_json, dict) else {}
    checklist = answers.get("_checklist")
    if not isinstance(checklist, dict):
        return False
    return checklist.get("status") == "pass"


def _build_intel(
    db: Session,
    *,
    days: int = COMPLIANCE_WINDOW_DAYS,
    pass_threshold: int = 85,
) -> ComplianceIntel:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    sessions = (
        db.query(ExecutionSession, Task, Outlet)
        .join(Task, ExecutionSession.task_id == Task.id)
        .join(Outlet, Task.outlet_id == Outlet.id)
        .filter(
            ExecutionSession.status == "completed",
            ExecutionSession.submitted_at.isnot(None),
            ExecutionSession.submitted_at >= prev_since,
        )
        .all()
    )

    scores_by_outlet: dict[int, dict] = {}
    for session, task, outlet in sessions:
        score = _checklist_score(session)
        passed = _checklist_passed(session)
        if score is None:
            continue
        bucket = scores_by_outlet.setdefault(
            task.outlet_id,
            {"name": outlet.name, "scores": [], "passed": 0, "recent": [], "recent_passed": 0},
        )
        bucket["scores"].append(score)
        bucket["passed"] += 1 if passed else 0
        if session.submitted_at >= since:
            bucket["recent"].append(score)
            bucket["recent_passed"] += 1 if passed else 0

    task_stats: dict[int, dict] = {}
    open_tasks = (
        db.query(Task, Outlet)
        .join(Outlet, Task.outlet_id == Outlet.id)
        .filter(Task.status.in_(["open", "in_progress"]))
        .all()
    )
    for task, outlet in open_tasks:
        bucket = task_stats.setdefault(
            task.outlet_id,
            {"name": outlet.name, "open": 0, "overdue": 0, "expired": 0, "high_stalled": 0},
        )
        bucket["open"] += 1
        if task.due_date and task.due_date < now:
            bucket["overdue"] += 1
        if task.expired_at is not None:
            bucket["expired"] += 1
        if (
            task.priority in ("high", "urgent")
            and task.status == "open"
            and task.created_at
            and task.created_at <= now - timedelta(hours=4)
        ):
            bucket["high_stalled"] += 1

    intel = ComplianceIntel(
        days=days,
        generated_at=now.isoformat(),
    )

    all_outlet_ids = {**{oid: b["name"] for oid, b in scores_by_outlet.items()},
                      **{oid: b["name"] for oid, b in task_stats.items()}}

    for outlet_id, name in all_outlet_ids.items():
        score_bucket = scores_by_outlet.get(outlet_id)
        task_bucket = task_stats.get(outlet_id, {"open": 0, "overdue": 0, "expired": 0, "high_stalled": 0})

        if score_bucket:
            all_scores = score_bucket["scores"]
            recent_scores = score_bucket["recent"]
            prev_scores = all_scores[len(all_scores) - len(recent_scores):] if recent_scores else []
            recent_avg = round(sum(recent_scores) / len(recent_scores)) if recent_scores else 0
            prev_avg = round(sum(prev_scores) / len(prev_scores)) if prev_scores else None
            pass_rate = round((score_bucket["recent_passed"] / len(recent_scores)) * 100) if recent_scores else 0
            submissions = len(recent_scores)
        else:
            recent_avg = 0
            prev_avg = None
            pass_rate = 0
            submissions = 0

        outlet_intel = OutletComplianceIntel(
            outlet_id=outlet_id,
            outlet_name=name,
            submissions=submissions,
            avg_score=recent_avg,
            pass_rate=pass_rate,
            overdue_tasks=task_bucket["overdue"],
            expired_tasks=task_bucket["expired"],
            open_tasks=task_bucket["open"],
            high_stalled_tasks=task_bucket["high_stalled"],
            prev_avg_score=prev_avg,
        )
        outlet_intel.anomaly_flags = _detect_anomalies(outlet_intel, pass_threshold=pass_threshold)
        intel.outlets.append(outlet_intel)

    intel.outlets.sort(key=lambda o: (not bool(o.anomaly_flags), o.avg_score), reverse=True)
    return intel


# --------------------------------------------------------------------------- #
# Anomaly detection: pure, deterministic, unit-testable
# --------------------------------------------------------------------------- #

def _detect_anomalies(
    outlet: OutletComplianceIntel,
    *,
    pass_threshold: int = 85,
    delta_threshold: int = 15,
) -> list[str]:
    flags: list[str] = []

    if outlet.expired_tasks > 0:
        flags.append(
            f"task expired: {outlet.expired_tasks} task terlewat lewat dan masuk laporan overdue"
        )

    if outlet.overdue_tasks > 0:
        flags.append(f"task overdue: {outlet.overdue_tasks} task belum dikerjakan setelah jatuh tempo")

    if outlet.high_stalled_tasks > 0:
        flags.append(
            f"task prioritas tinggi mangkrak: {outlet.high_stalled_tasks} task high/urgent belum dikerjakan >4 jam"
        )

    if outlet.submissions > 0 and outlet.avg_score < pass_threshold:
        flags.append(
            f"skor di bawah ambang: rata-rata {outlet.avg_score}% (ambang {pass_threshold}%)"
        )

    if outlet.submissions > 0 and outlet.score_delta is not None and outlet.score_delta <= -delta_threshold:
        flags.append(
            f"penurunan skor tajam: {outlet.prev_avg_score}% -> {outlet.avg_score}%"
        )

    if outlet.submissions == 0 and outlet.open_tasks > 0:
        flags.append(
            f"tidak ada submission: {outlet.open_tasks} task terbuka tanpa aktivitas dalam {COMPLIANCE_WINDOW_DAYS} hari"
        )

    return flags


# --------------------------------------------------------------------------- #
# Narrative: LLM first, rule-based fallback
# --------------------------------------------------------------------------- #

def _llm_config() -> dict:
    return {
        "base_url": (os.environ.get("LLM_API_BASE") or "https://api.groq.com/openai/v1").rstrip("/"),
        "api_key": os.environ.get("LLM_API_KEY") or "",
        "model": os.environ.get("LLM_MODEL") or "llama-3.3-70b-versatile",
        "timeout_seconds": int(os.environ.get("LLM_TIMEOUT_SECONDS") or "20"),
    }


def _llm_enabled() -> bool:
    cfg = _llm_config()
    return bool(cfg["api_key"])


def _build_prompt(intel: ComplianceIntel, pass_threshold: int = 85) -> str:
    lines = [
        "Kamu adalah satpam kepatuhan operasional untuk jaringan outlet retail.",
        "Berdasarkan data berikut, tulis narasi ringkas (maksimal 150 kata, bahasa Indonesia)",
        "yang: (1) menyebutkan outlet yang bermasalah, (2) menjelaskan pola/anomali, dan",
        "(3) memberi rekomendasi tindakan konkret. Format: paragraf narasi, lalu daftar",
        "rekomendasi dengan awalan '- '.",
        "",
        f"Ambang lulus skor: {pass_threshold}%. Jendela analisis: {intel.days} hari terakhir.",
        "Data per outlet (outlet_id | nama | submission | skor | pass_rate | overdue | expired | open | stalled_high | delta_skor | anomali):",
    ]
    for outlet in intel.outlets:
        delta = outlet.score_delta if outlet.score_delta is not None else "n/a"
        flags = "; ".join(outlet.anomaly_flags) if outlet.anomaly_flags else "-"
        lines.append(
            f"- {outlet.outlet_id} | {outlet.outlet_name} | {outlet.submissions} | "
            f"{outlet.avg_score}% | {outlet.pass_rate}% | {outlet.overdue_tasks} | "
            f"{outlet.expired_tasks} | {outlet.open_tasks} | {outlet.high_stalled_tasks} | "
            f"{delta} | {flags}"
        )
    return "\n".join(lines)


def _call_llm(prompt: str) -> str:
    cfg = _llm_config()
    if not cfg["api_key"]:
        raise RuntimeError("LLM_API_KEY not configured")

    payload = {
        "model": cfg["model"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 400,
    }
    request = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=cfg["timeout_seconds"]) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("LLM returned no choices")
        content = choices[0].get("message", {}).get("content") or ""
        return content.strip()


def _build_rule_based_narrative(intel: ComplianceIntel, pass_threshold: int = 85) -> str:
    if not intel.outlets_with_anomaly:
        lines = [
            "Tidak ditemukan anomali kepatuhan signifikan pada periode ini.",
            "Seluruh outlet memenuhi ambang lulus dan menyelesaikan task tepat waktu.",
        ]
        return "\n".join(lines)

    lines = [
        "Ringkasan kepatuhan periode ini (rule-based):",
        "",
        f"Ada {len(intel.outlets_with_anomaly)} outlet dengan indikator kepatuhan bermasalah:",
    ]
    for outlet in intel.outlets_with_anomaly:
        lines.append(f"- {outlet.outlet_name}: {'; '.join(outlet.anomaly_flags)}")
    lines.extend(["", "Rekomendasi:", "- Tindak lanjut task overdue/expired pada outlet di atas segera.", "- Konfirmasi ke area manager untuk task high/urgent yang mangkrak."])
    return "\n".join(lines)


def _compose_recommendations(intel: ComplianceIntel, *, pass_threshold: int = 85) -> list[str]:
    recommendations: list[str] = []
    for outlet in intel.outlets_with_anomaly:
        if outlet.expired_tasks or outlet.overdue_tasks:
            recommendations.append(
                f"Eskalasi ke area manager untuk {outlet.outlet_name}: {outlet.overdue_tasks} overdue / "
                f"{outlet.expired_tasks} expired task."
            )
        if outlet.high_stalled_tasks:
            recommendations.append(
                f"Hubungi {outlet.outlet_name} untuk task high/urgent yang mangkrak."
            )
        if outlet.submissions == 0 and outlet.open_tasks > 0:
            recommendations.append(
                f"Pastikan {outlet.outlet_name} login & membuka aplikasi; tidak ada submission selama "
                f"{intel.days} hari."
            )
        if outlet.avg_score < pass_threshold:
            recommendations.append(f"Review kualitas kerja {outlet.outlet_name} (skor di bawah ambang).")
    return recommendations


# --------------------------------------------------------------------------- #
# Public entry points
# --------------------------------------------------------------------------- #

def build_compliance_intel(
    db: Session,
    *,
    days: int = COMPLIANCE_WINDOW_DAYS,
) -> ComplianceIntel:
    settings = get_workspace_settings(db)
    return _build_intel(db, days=days, pass_threshold=int(settings.pass_threshold or 85))


def generate_narrative(
    intel: ComplianceIntel,
    *,
    pass_threshold: int = 85,
) -> dict:
    narrative: str
    source: str

    if _llm_enabled():
        try:
            narrative = _call_llm(_build_prompt(intel, pass_threshold=pass_threshold))
            source = "llm"
        except Exception:
            narrative = _build_rule_based_narrative(intel, pass_threshold=pass_threshold)
            source = "fallback"
    else:
        narrative = _build_rule_based_narrative(intel, pass_threshold=pass_threshold)
        source = "rule-based"

    return {
        "source": source,
        "narrative": narrative,
        "recommendations": _compose_recommendations(intel, pass_threshold=pass_threshold),
    }


def process_ai_compliance_guard(db: Session, *, force: bool = False) -> dict:
    intel = build_compliance_intel(db)
    settings = get_workspace_settings(db)
    pass_threshold = int(settings.pass_threshold or 85)

    if not force and not intel.outlets_with_anomaly:
        return {
            "run": True,
            "anomalies": 0,
            "narrative_source": "none",
            "message": "No compliance anomalies detected",
        }

    narrative = generate_narrative(intel, pass_threshold=pass_threshold)
    return {
        "run": True,
        "anomalies": len(intel.outlets_with_anomaly),
        "outlets": len(intel.outlets),
        "narrative_source": narrative["source"],
        "narrative": narrative["narrative"],
        "recommendations": narrative["recommendations"],
        "outlet_details": [asdict(o) for o in intel.outlets],
    }
