"""Report wipe deletes transactional rows and keeps schedules/templates untouched."""

import os
from contextlib import contextmanager

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://novaops:novaops@127.0.0.1:5433/novaops")

# Import app first to avoid circular model registry imports in isolation.
import app.main  # noqa: F401
from app.services import report_wipe


class _FakeQuery:
    def __init__(self, count: int):
        self.count = count

    def delete(self, synchronize_session=False):
        del synchronize_session
        return self.count


class _FakeDb:
    def __init__(self, counts: dict[type, int]):
        self.counts = counts
        self.committed = False
        self.rolled_back = False

    def query(self, model):
        return _FakeQuery(self.counts.get(model, 0))

    @contextmanager
    def begin_nested(self):
        yield

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


def test_wipe_report_data_deletes_expected_models_and_commits():
    models = [
        report_wipe.FinanceShiftDepositRecord,
        report_wipe.FormAnswer,
        report_wipe.FormSubmission,
        report_wipe.TaskComment,
        report_wipe.TaskAssignment,
        report_wipe.ExecutionSession,
        report_wipe.Task,
        report_wipe.TaskDraft,
        report_wipe.TaskScheduleException,
        report_wipe.FollowUpAction,
        report_wipe.Incident,
        report_wipe.ActivityEvent,
        report_wipe.AnnouncementRead,
        report_wipe.Announcement,
        report_wipe.NotificationDelivery,
        report_wipe.NotificationEvent,
        report_wipe.WebhookDelivery,
        report_wipe.WorkflowApprovalHistory,
        report_wipe.WorkflowTask,
        report_wipe.WorkflowVariable,
        report_wipe.WorkflowInstanceStep,
        report_wipe.WorkflowInstance,
    ]
    counts = {model: index + 1 for index, model in enumerate(models)}
    db = _FakeDb(counts)

    deleted = report_wipe.wipe_report_data_for_all_accounts(db)

    assert db.committed is True
    assert db.rolled_back is False
    assert sum(deleted.values()) == sum(counts.values())
    assert deleted["tasks"] == counts[report_wipe.Task]
    assert deleted["finance_shift_deposits"] == counts[report_wipe.FinanceShiftDepositRecord]
    assert "task_schedules" not in deleted
    assert "form_templates" not in deleted


def test_wipe_rolls_back_on_error():
    state = {"rolled_back": False}

    class _BoomDb:
        def query(self, *_args, **_kwargs):
            raise RuntimeError("boom")

        @contextmanager
        def begin_nested(self):
            raise RuntimeError("boom")
            yield  # pragma: no cover

        def commit(self):
            return None

        def rollback(self):
            state["rolled_back"] = True

    # begin_nested failures are swallowed per-table; force outer commit path by
    # making commit itself fail after deletes return 0.
    class _CommitBoomDb(_BoomDb):
        def begin_nested(self):
            @contextmanager
            def _nested():
                yield

            return _nested()

        def query(self, *_args, **_kwargs):
            return _FakeQuery(0)

        def commit(self):
            raise RuntimeError("commit failed")

    try:
        report_wipe.wipe_report_data_for_all_accounts(_CommitBoomDb())
        assert False, "expected RuntimeError"
    except RuntimeError:
        assert state["rolled_back"] is True
