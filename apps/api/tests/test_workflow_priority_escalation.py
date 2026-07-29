from types import SimpleNamespace

from app.models.task import Task
from app.services.workflow_triggers import maybe_trigger_checklist_fail_workflow


def _task() -> Task:
    return Task(id=901, title="Food safety exception", outlet_id=1)


def _capture_trigger(monkeypatch):
    captured: dict = {}

    monkeypatch.setattr(
        "app.services.workflow_triggers.get_workspace_settings",
        lambda _db: SimpleNamespace(
            auto_workflow_on_checklist_fail=True,
            checklist_fail_workflow_code="checklist-fail-review",
        ),
    )

    def fake_start(_db, **kwargs):
        captured.update(kwargs)

    monkeypatch.setattr("app.services.workflow_triggers._start_workflow", fake_start)
    return captured


def test_critical_failure_gets_four_hour_sla(db, monkeypatch):
    captured = _capture_trigger(monkeypatch)

    maybe_trigger_checklist_fail_workflow(
        db,
        task=_task(),
        checklist={
            "status": "fail",
            "score": 82,
            "failed_items": [{"label": "Cold holding"}],
            "critical_failures": [{"label": "Cold holding"}],
        },
    )

    context = captured["context_json"]
    assert context["priority"] == "critical"
    assert context["sla_hours"] == 4
    assert context["critical_failures"] == [{"label": "Cold holding"}]


def test_low_score_gets_high_priority_and_score_is_clamped(db, monkeypatch):
    captured = _capture_trigger(monkeypatch)

    maybe_trigger_checklist_fail_workflow(
        db,
        task=_task(),
        checklist={
            "status": "fail",
            "score": -20,
            "failed_items": "invalid",
        },
    )

    context = captured["context_json"]
    assert context["checklist_score"] == 0
    assert context["failed_items"] == []
    assert context["priority"] == "high"
    assert context["sla_hours"] == 24


def test_non_numeric_score_fails_safe(db, monkeypatch):
    captured = _capture_trigger(monkeypatch)

    maybe_trigger_checklist_fail_workflow(
        db,
        task=_task(),
        checklist={"status": "attention", "score": "not-a-number"},
    )

    context = captured["context_json"]
    assert context["checklist_score"] == 0
    assert context["priority"] == "high"
