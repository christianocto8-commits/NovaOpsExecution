from types import SimpleNamespace

from app.services.checklist_scoring import _score_field


def _select_field(choices: list[str], *, critical: bool = False):
    return SimpleNamespace(
        id=1,
        form_template_id=1,
        label="Task check",
        field_type="select",
        is_required=True,
        sort_order=0,
        options_json={"choices": choices, "standard": "Test standard"},
        validation_json={"critical": critical, "weight": 1},
    )


def test_select_pass_fail_na_scoring():
    field = _select_field(["Pass", "Fail", "N/A"])
    assert _score_field(field, "Pass") == (True, None)
    assert _score_field(field, "Fail")[0] is False
    assert _score_field(field, "N/A") == (True, None)


def test_select_assessment_not_ready_fails():
    field = _select_field(["Ready", "Ready with Notes", "Not Ready"])
    assert _score_field(field, "Ready") == (True, None)
    assert _score_field(field, "Ready with Notes") == (True, None)
    assert _score_field(field, "Not Ready")[0] is False


def test_select_supervisor_approval():
    field = _select_field(["Approved", "Rejected"])
    assert _score_field(field, "Approved") == (True, None)
    assert _score_field(field, "Rejected")[0] is False
