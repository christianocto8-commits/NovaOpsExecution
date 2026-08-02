"""CAPA evidence should persist structured task fields."""

from types import SimpleNamespace

from app.modules.tasks.schemas import CorrectiveActionEvidenceUpdate
from app.modules.tasks.service import TaskService


class _Repo:
    def __init__(self):
        self.comments = []

    def create_comment(self, comment):
        self.comments.append(comment)
        return comment


def test_update_corrective_action_evidence_sets_structured_fields(monkeypatch):
    service = TaskService.__new__(TaskService)
    service.db = SimpleNamespace(commit=lambda: None, refresh=lambda _task: None)
    service.repo = _Repo()

    task = SimpleNamespace(
        id=11,
        source_type="corrective_action",
        status="in_progress",
        capa_root_cause=None,
        capa_before_evidence_url=None,
        capa_after_evidence_url=None,
        capa_evidence_note=None,
    )
    service.get_task = lambda task_id, outlet_id: task

    payload = CorrectiveActionEvidenceUpdate(
        root_cause="Broken gasket",
        before_evidence_url="https://cdn.example/before.jpg",
        after_evidence_url="https://cdn.example/after.jpg",
        note="Replaced and verified",
    )

    result = service.update_corrective_action_evidence(
        task_id=11,
        outlet_id=1,
        actor_id=7,
        payload=payload,
    )

    assert result.capa_root_cause == "Broken gasket"
    assert result.capa_before_evidence_url == "https://cdn.example/before.jpg"
    assert result.capa_after_evidence_url == "https://cdn.example/after.jpg"
    assert result.capa_evidence_note == "Replaced and verified"
    assert service.repo.comments
    assert service.repo.comments[0].event_type == "capa_evidence"
