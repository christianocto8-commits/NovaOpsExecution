import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.services.template_settings import template_requires_execution_note
from app.services.workspace_settings import get_workspace_settings

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")


def _extract_urls_from_value(value: object) -> list[str]:
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []

        if trimmed.startswith("["):
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError:
                return [trimmed]

            if not isinstance(parsed, list):
                return [trimmed]

            urls: list[str] = []
            for item in parsed:
                url = item.get("url") if isinstance(item, dict) else None
                if isinstance(url, str) and url.strip():
                    urls.append(url.strip())
            return urls

        if trimmed.startswith("{"):
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError:
                return [trimmed]

            if isinstance(parsed, dict):
                url = parsed.get("url")
                if isinstance(url, str) and url.strip():
                    return [url.strip()]

        return [trimmed]

    if isinstance(value, dict):
        url = value.get("url")
        if isinstance(url, str) and url.strip():
            return [url.strip()]

    return []


def extract_evidence_urls(answers_json: dict[str, Any]) -> list[str]:
    evidence = answers_json.get("evidence")

    if not isinstance(evidence, str) or not evidence.strip():
        urls: list[str] = []
    else:
        try:
            parsed = json.loads(evidence)
        except json.JSONDecodeError:
            urls = [evidence.strip()]
        else:
            if not isinstance(parsed, list):
                urls = [evidence.strip()]
            else:
                urls = []
                for item in parsed:
                    if isinstance(item, dict):
                        url = item.get("url")
                        if isinstance(url, str) and url.strip():
                            urls.append(url.strip())

    responses = answers_json.get("responses")
    if isinstance(responses, dict):
        for value in responses.values():
            urls.extend(_extract_urls_from_value(value))

    return urls


def is_photo_evidence_url(url: str) -> bool:
    normalized = url.lower().split("?", 1)[0]
    if "/uploads/evidence/" in normalized or "/evidence-uploads/" in normalized:
        return True
    return normalized.endswith(IMAGE_EXTENSIONS)


def validate_task_execution_answers(
    db: Session,
    answers_json: dict[str, Any],
    *,
    form_template_id: int | None = None,
) -> None:
    settings = get_workspace_settings(db)
    evidence_urls = extract_evidence_urls(answers_json)
    note = answers_json.get("note")
    has_note = isinstance(note, str) and note.strip()

    if form_template_id and template_requires_execution_note(db, form_template_id) and not has_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Execution Note wajib diisi.",
        )

    if settings.evidence_required and not evidence_urls and not has_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence atau catatan wajib diisi.",
        )

    if settings.photo_required_by_default:
        photo_urls = [url for url in evidence_urls if is_photo_evidence_url(url)]
        if not photo_urls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bukti foto wajib diunggah.",
            )

    freshness_minutes = getattr(settings, "photo_freshness_minutes", 0) or 0
    if freshness_minutes > 0:
        stale_captured_at = _oldest_photo_captured_at(answers_json)
        if stale_captured_at is not None:
            age_minutes = int((datetime.now(timezone.utc) - stale_captured_at).total_seconds() // 60)
            if age_minutes > freshness_minutes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Foto harus diambil dalam {freshness_minutes} menit sebelum submit "
                        f"(foto saat ini {age_minutes} menit). Ambil ulang foto terkini."
                    ),
                )

    if getattr(settings, "signature_required_by_default", False):
        has_signature = _has_signature_evidence(answers_json, evidence_urls)
        if not has_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanda tangan wajib diisi.",
            )


def _oldest_photo_captured_at(answers_json: dict) -> datetime | None:
    """Return the oldest captured_at (epoch ms) found across photo field values, or None."""
    candidates: list[datetime] = []

    def _scan(value: Any) -> None:
        if isinstance(value, str):
            trimmed = value.strip()
            if not (trimmed.startswith("{") or trimmed.startswith("[")):
                return
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError:
                return
            _scan(parsed)
            return
        if isinstance(value, dict):
            captured_at = value.get("captured_at")
            if isinstance(captured_at, (int, float)) and captured_at > 0:
                candidates.append(datetime.fromtimestamp(captured_at / 1000, tz=timezone.utc))
            for nested in value.values():
                _scan(nested)
            return
        if isinstance(value, list):
            for nested in value:
                _scan(nested)

    _scan(answers_json.get("responses"))
    _scan(answers_json.get("evidence"))

    return min(candidates, default=None)


def _has_signature_evidence(answers_json: dict, evidence_urls: list[str]) -> bool:
    for url in evidence_urls:
        lowered = str(url).lower()
        if "signature" in lowered or lowered.startswith("data:image"):
            return True

    for key, value in answers_json.items():
        key_lower = str(key).lower()
        if "signature" in key_lower and value not in (None, "", [], {}):
            return True
        if isinstance(value, str) and value.startswith("data:image"):
            return True
        if isinstance(value, dict):
            nested = value.get("signature") or value.get("dataUrl") or value.get("url")
            if nested not in (None, "", [], {}):
                return True

    return False


def compliance_score(completion_rate: int, pass_threshold: int) -> int:
    threshold = max(1, min(100, pass_threshold))
    if completion_rate >= threshold:
        return 100
    return round((completion_rate / threshold) * 100)
