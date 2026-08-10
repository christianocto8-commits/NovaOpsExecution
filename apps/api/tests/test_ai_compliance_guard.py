"""AI compliance guard: anomaly detection, rule-based narrative fallback, and
optional LLM path must all work deterministically without a network."""
from types import SimpleNamespace

from app.services import ai_compliance
from app.services.ai_compliance import (
    OutletComplianceIntel,
    _build_rule_based_narrative,
    _detect_anomalies,
    _llm_config,
    generate_narrative,
)


def _outlet(**overrides) -> OutletComplianceIntel:
    defaults = dict(
        outlet_id=1,
        outlet_name="Outlet A",
        submissions=5,
        avg_score=90,
        pass_rate=100,
        overdue_tasks=0,
        expired_tasks=0,
        open_tasks=0,
        high_stalled_tasks=0,
        prev_avg_score=None,
        anomaly_flags=[],
    )
    defaults.update(overrides)
    return OutletComplianceIntel(**defaults)


def test_no_anomaly_when_healthy():
    outlet = _outlet()
    assert _detect_anomalies(outlet, pass_threshold=85) == []


def test_expired_and_overdue_flags():
    outlet = _outlet(expired_tasks=2, overdue_tasks=3)
    flags = _detect_anomalies(outlet, pass_threshold=85)
    assert any("task expired" in f for f in flags)
    assert any("task overdue" in f for f in flags)


def test_score_below_threshold_flag():
    outlet = _outlet(avg_score=70)
    flags = _detect_anomalies(outlet, pass_threshold=85)
    assert any("skor di bawah ambang" in f for f in flags)


def test_sharp_score_drop_flag():
    outlet = _outlet(avg_score=60, prev_avg_score=90)
    flags = _detect_anomalies(outlet, pass_threshold=85)
    assert any("penurunan skor tajam" in f for f in flags)


def test_no_submission_with_open_tasks_flag():
    outlet = _outlet(submissions=0, open_tasks=2)
    flags = _detect_anomalies(outlet, pass_threshold=85)
    assert any("tidak ada submission" in f for f in flags)


def test_high_stalled_flag():
    outlet = _outlet(high_stalled_tasks=1)
    flags = _detect_anomalies(outlet, pass_threshold=85)
    assert any("mangkrak" in f for f in flags)


def test_rule_based_narrative_lists_anomalies():
    outlet = _outlet(expired_tasks=1)
    outlet.anomaly_flags = _detect_anomalies(outlet, pass_threshold=85)
    intel = SimpleNamespace(outlets_with_anomaly=[outlet], days=7)
    text = _build_rule_based_narrative(intel, pass_threshold=85)
    assert "Outlet A" in text
    assert "Rekomendasi" in text


def test_rule_based_narrative_clean_when_no_anomalies():
    intel = SimpleNamespace(outlets_with_anomaly=[], days=7)
    text = _build_rule_based_narrative(intel, pass_threshold=85)
    assert "Tidak ditemukan anomali" in text


def test_generate_narrative_uses_rule_based_without_key(monkeypatch):
    monkeypatch.setattr(ai_compliance, "_llm_enabled", lambda: False)
    intel = SimpleNamespace(outlets_with_anomaly=[], days=7)
    result = generate_narrative(intel, pass_threshold=85)
    assert result["source"] == "rule-based"
    assert "Tidak ditemukan anomali" in result["narrative"]
    assert isinstance(result["recommendations"], list)


def test_generate_narrative_falls_back_when_llm_key_set_but_call_fails(monkeypatch):
    monkeypatch.setattr(ai_compliance, "_llm_enabled", lambda: True)

    def boom(_prompt):
        raise RuntimeError("network down")

    monkeypatch.setattr(ai_compliance, "_call_llm", boom)

    outlet = _outlet(expired_tasks=1)
    outlet.anomaly_flags = _detect_anomalies(outlet, pass_threshold=85)
    intel = SimpleNamespace(outlets_with_anomaly=[outlet], days=7)

    result = generate_narrative(intel, pass_threshold=85)
    assert result["source"] == "fallback"
    assert "Outlet A" in result["narrative"]


def test_llm_config_defaults_no_key():
    assert _llm_config()["api_key"] == ""
    assert _llm_config()["model"]


def test_recommendations_mention_escalation():
    outlet = _outlet(expired_tasks=1, overdue_tasks=2)
    outlet.anomaly_flags = _detect_anomalies(outlet, pass_threshold=85)
    intel = SimpleNamespace(outlets_with_anomaly=[outlet], days=7)
    recommendations = ai_compliance._compose_recommendations(intel, pass_threshold=85)
    assert any("Eskalasi" in r for r in recommendations)

def test_process_ai_compliance_guard_reports_anomalies(db):
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4

    from app.models.execution_session import ExecutionSession
    from app.models.outlet import Outlet
    from app.models.task import Task
    from app.services.ai_compliance import process_ai_compliance_guard

    now = datetime.now(timezone.utc)

    stale_ids = [
        row[0] for row in db.query(Task.id).filter(Task.title == "AI guard task").all()
    ]
    if stale_ids:
        db.query(ExecutionSession).filter(ExecutionSession.task_id.in_(stale_ids)).delete(synchronize_session=False)
        db.query(Task).filter(Task.id.in_(stale_ids)).delete(synchronize_session=False)

    outlet = Outlet(
        name="AI Guard Outlet",
        code="AIGUARD-" + uuid4().hex[:6].upper(),
        is_active=True,
    )
    db.add(outlet)
    db.flush()

    task = Task(
        title="AI guard task",
        description=None,
        outlet_id=outlet.id,
        assigned_to=1,
        created_by=1,
        priority="medium",
        status="open",
        due_date=now - timedelta(hours=2),
    )
    db.add(task)
    db.flush()

    db.add(
        ExecutionSession(
            task_id=task.id,
            source_type="sop_task",
            status="completed",
            answers_json={"_checklist": {"score": 60, "status": "fail"}},
            submitted_by=1,
            submitted_at=now - timedelta(hours=1),
        )
    )
    db.commit()

    try:
        result = process_ai_compliance_guard(db, force=True)
        assert result["anomalies"] >= 1
        assert result["outlets"] >= 1
        assert result["narrative"]
        assert isinstance(result["recommendations"], list)
    finally:
        db.query(ExecutionSession).filter(ExecutionSession.task_id == task.id).delete(synchronize_session=False)
        db.query(Task).filter(Task.id == task.id).delete(synchronize_session=False)
        db.query(Outlet).filter(Outlet.id == outlet.id).delete(synchronize_session=False)
        db.commit()
