from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.form_field import FormField
from app.services.workspace_settings import get_workspace_settings

YES_VALUES = {"yes", "ya", "true", "1"}
NO_VALUES = {"no", "false", "0"}


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip()


def _is_filled(value: Any) -> bool:
    return bool(_normalize_text(value))


def _get_response(responses: dict[str, Any], field_id: int) -> Any:
    key = str(field_id)
    if key in responses:
        return responses[key]
    if field_id in responses:
        return responses[field_id]
    return None


def _score_yes_no(value: Any) -> tuple[bool | None, str | None]:
    normalized = _normalize_text(value).lower()
    if not normalized:
        return None, "No answer provided"
    if normalized in YES_VALUES:
        return True, None
    if normalized in NO_VALUES:
        return False, "Answered no"
    return False, f"Invalid yes/no value: {value}"


def _extract_bounds(validation_json: Any, options_json: Any) -> tuple[float | None, float | None]:
    min_val: float | None = None
    max_val: float | None = None

    for source in (validation_json, options_json):
        if not isinstance(source, dict):
            continue
        if min_val is None and source.get("min") is not None:
            min_val = float(source["min"])
        if max_val is None and source.get("max") is not None:
            max_val = float(source["max"])

    return min_val, max_val


def _score_number(value: Any, validation_json: Any, options_json: Any) -> tuple[bool | None, str | None]:
    normalized = _normalize_text(value)
    if not normalized:
        return None, "No answer provided"

    try:
        numeric = float(normalized.replace(",", ""))
    except ValueError:
        return False, f"Invalid number: {value}"

    min_val, max_val = _extract_bounds(validation_json, options_json)

    if min_val is not None and numeric < min_val:
        return False, f"Value {numeric} below minimum {min_val}"
    if max_val is not None and numeric > max_val:
        return False, f"Value {numeric} above maximum {max_val}"
    return True, None


def _score_field(field: FormField, value: Any) -> tuple[bool | None, str | None]:
    if not _is_filled(value) and not field.is_required:
        return None, None

    field_type = field.field_type.lower()

    if field_type == "yes_no":
        return _score_yes_no(value)

    if field_type == "number":
        return _score_number(value, field.validation_json, field.options_json)

    if field_type in {"photo", "signature"}:
        if not _is_filled(value):
            return False, "Required evidence missing"
        return True, None

    if field_type == "select":
        if not _is_filled(value):
            return False, "Required field empty"
        choices = []
        if isinstance(field.options_json, dict):
            raw_choices = field.options_json.get("choices")
            if isinstance(raw_choices, list):
                choices = [str(item).strip() for item in raw_choices if str(item).strip()]
        if choices and _normalize_text(value) not in choices:
            return False, f"Invalid selection: {value}"
        return True, None

    if field_type in {"date", "time"}:
        if not _is_filled(value):
            return False, "Required field empty"
        return True, None

    if not _is_filled(value):
        return False, "Required field empty"

    return True, None


def score_checklist(
    db: Session,
    *,
    form_template_id: int | None,
    answers_json: dict[str, Any],
) -> dict[str, Any]:
    settings = get_workspace_settings(db)
    pass_threshold = max(1, min(100, settings.pass_threshold))

    if not form_template_id:
        return {
            "score": 100,
            "passed_count": 0,
            "failed_count": 0,
            "total_scorable": 0,
            "failed_items": [],
            "status": "pass",
        }

    fields = (
        db.query(FormField)
        .filter(FormField.form_template_id == form_template_id)
        .order_by(FormField.sort_order.asc())
        .all()
    )

    responses = answers_json.get("responses") or {}
    if not isinstance(responses, dict):
        responses = {}

    passed_count = 0
    failed_count = 0
    total_scorable = 0
    failed_items: list[dict[str, Any]] = []

    for field in fields:
        value = _get_response(responses, field.id)
        passed, reason = _score_field(field, value)

        if passed is None:
            continue

        total_scorable += 1
        if passed:
            passed_count += 1
        else:
            failed_count += 1
            failed_items.append(
                {
                    "field_id": field.id,
                    "label": field.label,
                    "value": _normalize_text(value) or None,
                    "reason": reason or "Failed",
                }
            )

    score = round((passed_count / total_scorable) * 100) if total_scorable > 0 else 100

    if score >= pass_threshold:
        status = "pass"
    elif failed_count > 0:
        status = "fail"
    else:
        status = "attention"

    return {
        "score": score,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "total_scorable": total_scorable,
        "failed_items": failed_items,
        "status": status,
    }
