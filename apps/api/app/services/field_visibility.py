from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.form_field import FormField

YES_VALUES = {"yes", "ya", "true", "1"}
NO_VALUES = {"no", "tidak", "false", "0"}
FAIL_VALUES = {"fail", "gagal"}
PASS_VALUES = {"pass", "lulus"}


def _normalize_comparable(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in YES_VALUES:
        return "yes"
    if normalized in NO_VALUES:
        return "no"
    if normalized in FAIL_VALUES:
        return "fail"
    if normalized in PASS_VALUES:
        return "pass"
    return normalized


def _get_response(responses: dict[str, Any], field_id: str | int) -> str:
    key = str(field_id)
    if key in responses:
        return str(responses[key] or "").strip()
    if field_id in responses:
        return str(responses[field_id] or "").strip()
    return ""


def resolve_visibility_rule(options_json: Any) -> dict[str, Any] | None:
    if not isinstance(options_json, dict):
        return None

    rule = options_json.get("visibilityRule")
    if isinstance(rule, dict) and rule.get("fieldId"):
        return {
            "fieldId": str(rule["fieldId"]),
            "operator": str(rule.get("operator") or "equals"),
            "value": str(rule.get("value") or ""),
        }

    legacy_field_id = options_json.get("showWhenFieldId")
    if legacy_field_id:
        return {
            "fieldId": str(legacy_field_id),
            "operator": "equals",
            "value": str(options_json.get("showWhenValue") or "yes"),
        }

    return None


def is_field_visible(field: FormField, responses: dict[str, Any]) -> bool:
    rule = resolve_visibility_rule(field.options_json)
    if not rule:
        return True

    actual = _get_response(responses, rule["fieldId"])
    operator = rule.get("operator", "equals")
    expected = str(rule.get("value") or "")

    if operator == "is_empty":
        return len(actual) == 0
    if operator == "is_not_empty":
        return len(actual) > 0

    if not actual and operator not in {"equals", "not_equals"}:
        return False

    actual_norm = _normalize_comparable(actual)
    expected_norm = _normalize_comparable(expected)

    if operator == "equals":
        return actual_norm == expected_norm
    if operator == "not_equals":
        return actual_norm != expected_norm
    if operator == "contains":
        return expected_norm in actual_norm

    return True


def _is_filled(value: str) -> bool:
    return bool(value.strip())


def validate_conditional_required_fields(
    db: Session,
    *,
    form_template_id: int,
    responses: dict[str, Any],
) -> None:
    fields = (
        db.query(FormField)
        .filter(FormField.form_template_id == form_template_id)
        .order_by(FormField.sort_order.asc())
        .all()
    )

    missing: list[str] = []

    for field in fields:
        if not field.is_required:
            continue
        if not is_field_visible(field, responses):
            continue

        value = _get_response(responses, field.id)
        if not _is_filled(value):
            missing.append(field.label)

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Required conditional fields are missing.",
                "missing_fields": missing,
            },
        )
