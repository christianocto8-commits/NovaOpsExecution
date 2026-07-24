import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.services.template_settings import template_requires_execution_note
from app.services.workspace_settings import get_workspace_settings

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")


def _extract_url_from_value(value: object) -> str | None:
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return None

        if trimmed.startswith("{"):
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError:
                return trimmed

            if isinstance(parsed, dict):
                url = parsed.get("url")
                if isinstance(url, str) and url.strip():
                    return url.strip()

        return trimmed

    if isinstance(value, dict):
        url = value.get("url")
        if isinstance(url, str) and url.strip():
            return url.strip()

    return None


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
            url = _extract_url_from_value(value)
            if url:
                urls.append(url)

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


def compliance_score(completion_rate: int, pass_threshold: int) -> int:
    threshold = max(1, min(100, pass_threshold))
    if completion_rate >= threshold:
        return 100
    return round((completion_rate / threshold) * 100)
