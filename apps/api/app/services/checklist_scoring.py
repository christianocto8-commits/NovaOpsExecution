from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.form_field import FormField
from app.services.field_visibility import is_field_visible
from app.services.workspace_settings import get_workspace_settings

YES_VALUES = {"yes", "ya", "true", "1"}
NO_VALUES = {"no", "false", "0"}
NA_VALUES = {"n/a", "na", "tidak berlaku", "tidak_berlaku"}


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip()


def _is_filled(value: Any) -> bool:
    return bool(_normalize_text(value))


def _is_na_value(value: Any) -> bool:
    return _normalize_text(value).lower() in NA_VALUES


def _field_allows_na(field: FormField) -> bool:
    return isinstance(field.options_json, dict) and field.options_json.get("allow_na") is True


def _get_field_weight(field: FormField) -> float:
    if isinstance(field.validation_json, dict):
        weight = field.validation_json.get("weight")
        if weight is not None:
            try:
                parsed = float(weight)
                if parsed > 0:
                    return parsed
            except (TypeError, ValueError):
                pass
    return 1.0


def _is_critical_field(field: FormField) -> bool:
    return isinstance(field.validation_json, dict) and field.validation_json.get("critical") is True


def _get_response(responses: dict[str, Any], field_id: int) -> Any:
    key = str(field_id)
    if key in responses:
        return responses[key]
    if field_id in responses:
        return responses[field_id]
    return None


def _score_yes_no(value: Any, *, allow_na: bool = False) -> tuple[bool | None, str | None]:
    normalized = _normalize_text(value).lower()
    if not normalized:
        return None, "No answer provided"
    if allow_na and normalized in NA_VALUES:
        return None, None
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


def _score_rating(value: Any, validation_json: Any, options_json: Any) -> tuple[bool | None, str | None]:
    normalized = _normalize_text(value)
    if not normalized:
        return None, "No answer provided"

    try:
        rating = float(normalized.replace(",", ""))
    except ValueError:
        return False, f"Invalid rating: {value}"

    max_stars = 5.0
    if isinstance(options_json, dict) and options_json.get("maxStars") is not None:
        try:
            max_stars = max(1.0, float(options_json["maxStars"]))
        except (TypeError, ValueError):
            pass

    if rating < 1 or rating > max_stars:
        return False, f"Rating {rating} outside range 1-{int(max_stars)}"

    min_val, _max_val = _extract_bounds(validation_json, options_json)
    threshold = min_val if min_val is not None else 3.0

    if rating >= threshold:
        return True, None
    return False, f"Rating {rating} below threshold {threshold}"


def _score_field(field: FormField, value: Any) -> tuple[bool | None, str | None]:
    allow_na = _field_allows_na(field)

    if not _is_filled(value) and not field.is_required:
        return None, None

    field_type = field.field_type.lower()

    if field_type == "yes_no":
        return _score_yes_no(value, allow_na=allow_na)

    if field_type in {"number", "money_amount", "money_denomination"}:
        return _score_number(value, field.validation_json, field.options_json)

    if field_type == "rating":
        return _score_rating(value, field.validation_json, field.options_json)

    if field_type == "barcode":
        if not _is_filled(value):
            return False, "Required barcode missing"
        return True, None

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
            "na_count": 0,
            "failed_items": [],
            "critical_failures": [],
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
    na_count = 0
    total_weight = 0.0
    passed_weight = 0.0
    failed_items: list[dict[str, Any]] = []
    critical_failures: list[dict[str, Any]] = []
    section_stats: dict[str, dict[str, float | int]] = {}

    for field in fields:
        if field.field_type == "responsible_person":
            continue
        if not is_field_visible(field, responses):
            continue

        value = _get_response(responses, field.id)
        allow_na = _field_allows_na(field)

        if field.field_type.lower() == "yes_no" and allow_na and _is_na_value(value):
            na_count += 1
            continue

        passed, reason = _score_field(field, value)

        if passed is None:
            continue

        weight = _get_field_weight(field)
        is_critical = _is_critical_field(field)
        total_scorable += 1
        total_weight += weight

        section_name = (field.help_text or "General").strip() or "General"
        section_bucket = section_stats.setdefault(
            section_name,
            {"passed": 0, "failed": 0, "total": 0, "weight": 0.0, "passed_weight": 0.0},
        )
        section_bucket["total"] = int(section_bucket["total"]) + 1
        section_bucket["weight"] = float(section_bucket["weight"]) + weight

        if passed:
            passed_count += 1
            passed_weight += weight
            section_bucket["passed"] = int(section_bucket["passed"]) + 1
            section_bucket["passed_weight"] = float(section_bucket["passed_weight"]) + weight
        else:
            failed_count += 1
            section_bucket["failed"] = int(section_bucket["failed"]) + 1
            item = {
                "field_id": field.id,
                "label": field.label,
                "value": _normalize_text(value) or None,
                "reason": reason or "Failed",
                "critical": is_critical,
            }
            failed_items.append(item)
            if is_critical:
                critical_failures.append(item)

    score = round((passed_weight / total_weight) * 100) if total_weight > 0 else 100

    section_scores: dict[str, dict[str, Any]] = {}
    for section_name, bucket in section_stats.items():
        section_weight = float(bucket["weight"])
        section_passed_weight = float(bucket["passed_weight"])
        section_scores[section_name] = {
            "passed": int(bucket["passed"]),
            "failed": int(bucket["failed"]),
            "total": int(bucket["total"]),
            "pass_rate": round((section_passed_weight / section_weight) * 100)
            if section_weight > 0
            else 100,
        }

    if critical_failures:
        status = "fail"
    elif score >= pass_threshold:
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
        "na_count": na_count,
        "failed_items": failed_items,
        "critical_failures": critical_failures,
        "section_scores": section_scores,
        "status": status,
    }
