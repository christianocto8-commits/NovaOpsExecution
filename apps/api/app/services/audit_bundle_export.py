from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timedelta, timezone
from io import BytesIO, StringIO
from pathlib import Path
from urllib.parse import unquote, urlparse
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session, joinedload

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.services.execution_validation import extract_evidence_urls
from app.services.s3_storage import download_bytes, is_s3_configured

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "evidence"


def _format_datetime(value: datetime | None) -> str:
    if not value:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _csv_bytes(headers: list[str], rows: list[list[object]]) -> bytes:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def _task_scope_query(
    db: Session,
    *,
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    all_outlets: bool,
):
    query = db.query(Task).options(joinedload(Task.outlet)).order_by(Task.id.asc())

    if outlet_id is not None:
        return query.filter(Task.outlet_id == outlet_id)
    if outlet_ids is not None:
        return query.filter(Task.outlet_id.in_(outlet_ids) if outlet_ids else Task.id == -1)
    if all_outlets:
        return query
    return query.filter(Task.id == -1)


def _stored_evidence_name(url: str) -> str | None:
    parsed = urlparse(url)
    path = unquote(parsed.path or url)
    marker_paths = ("/api/v1/evidence-uploads/", "/evidence-uploads/", "/uploads/evidence/")

    for marker in marker_paths:
        if marker in path:
            candidate = path.rsplit(marker, 1)[-1].strip("/")
            return Path(candidate).name if candidate else None

    return None


def _read_evidence_bytes(url: str) -> tuple[str | None, bytes | None, str]:
    stored_name = _stored_evidence_name(url)
    if not stored_name:
        return None, None, "external_url"

    if is_s3_configured():
        try:
            return stored_name, download_bytes(f"evidence/{stored_name}"), "included"
        except Exception:
            return stored_name, None, "missing"

    path = UPLOAD_ROOT / stored_name
    if not path.is_file():
        return stored_name, None, "missing"

    return stored_name, path.read_bytes(), "included"


def _safe_bundle_path(task_id: object, source_type: object, source_id: object, stored_name: str) -> str:
    safe_name = "".join(char for char in stored_name if char.isalnum() or char in ".-_") or "evidence.bin"
    return f"evidence/task-{task_id}/{source_type}-{source_id}-{safe_name}"


def build_audit_bundle_zip(
    db: Session,
    *,
    days: int,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
) -> bytes:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    tasks = (
        _task_scope_query(
            db,
            outlet_id=outlet_id,
            outlet_ids=outlet_ids,
            all_outlets=all_outlets,
        )
        .filter(Task.created_at >= since)
        .all()
    )
    task_ids = [task.id for task in tasks]

    sessions = (
        db.query(ExecutionSession)
        .filter(ExecutionSession.task_id.in_(task_ids) if task_ids else ExecutionSession.id == -1)
        .order_by(ExecutionSession.task_id.asc(), ExecutionSession.id.desc())
        .all()
    )
    comments = (
        db.query(TaskComment)
        .filter(TaskComment.task_id.in_(task_ids) if task_ids else TaskComment.id == -1)
        .order_by(TaskComment.created_at.desc())
        .all()
    )

    session_by_task: dict[int, ExecutionSession] = {}
    evidence_rows: list[list[object]] = []
    evidence_payloads: list[tuple[str, bytes]] = []
    included_files = 0
    missing_files = 0
    external_urls = 0

    def add_evidence_row(task_id: object, source_id: object, source_type: str, url: str) -> None:
        nonlocal included_files, missing_files, external_urls

        stored_name, content, status = _read_evidence_bytes(url)
        bundle_path = ""
        checksum = ""
        size_bytes = ""

        if status == "included" and stored_name and content is not None:
            bundle_path = _safe_bundle_path(task_id, source_type, source_id, stored_name)
            checksum = hashlib.sha256(content).hexdigest()
            size_bytes = str(len(content))
            evidence_payloads.append((bundle_path, content))
            included_files += 1
        elif status == "missing":
            missing_files += 1
        else:
            external_urls += 1

        evidence_rows.append(
            [
                task_id,
                source_id,
                source_type,
                url,
                status,
                bundle_path,
                checksum,
                size_bytes,
            ]
        )

    for session in sessions:
        if session.task_id is not None and session.task_id not in session_by_task:
            session_by_task[session.task_id] = session

        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        for url in extract_evidence_urls(answers):
            add_evidence_row(session.task_id or "", session.id, "execution_session", url)

    for comment in comments:
        if comment.evidence_url:
            add_evidence_row(comment.task_id, comment.id, comment.event_type, comment.evidence_url)

    task_rows = []
    for task in tasks:
        session = session_by_task.get(task.id)
        checklist = {}
        if session and isinstance(session.answers_json, dict):
            raw_checklist = session.answers_json.get("_checklist")
            checklist = raw_checklist if isinstance(raw_checklist, dict) else {}

        task_rows.append(
            [
                task.id,
                task.outlet.name if task.outlet else f"Outlet {task.outlet_id}",
                task.title,
                task.status,
                task.priority,
                _format_datetime(task.due_date),
                _format_datetime(task.completed_at),
                checklist.get("score", ""),
                checklist.get("status", ""),
                len(checklist.get("failed_items") or []),
                "yes" if task.source_type == "corrective_action" else "no",
            ]
        )

    comment_rows = [
        [
            comment.id,
            comment.task_id,
            comment.user_id,
            comment.event_type,
            comment.comment,
            comment.evidence_url or "",
            _format_datetime(comment.created_at),
        ]
        for comment in comments
    ]

    sessions_payload = [
        {
            "id": session.id,
            "task_id": session.task_id,
            "form_template_id": session.form_template_id,
            "source_type": session.source_type,
            "status": session.status,
            "submitted_by": session.submitted_by,
            "submitted_at": _format_datetime(session.submitted_at),
            "answers_json": session.answers_json,
        }
        for session in sessions
    ]
    manifest = {
        "generated_at": _format_datetime(datetime.now(timezone.utc)),
        "days": days,
        "task_count": len(tasks),
        "session_count": len(sessions),
        "comment_count": len(comments),
        "evidence_reference_count": len(evidence_rows),
        "evidence_files_included": included_files,
        "evidence_files_missing": missing_files,
        "external_evidence_urls": external_urls,
        "contains_files": included_files > 0,
        "notes": "Local/S3 evidence files are embedded when available. External URLs stay as references.",
    }

    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as bundle:
        bundle.writestr("manifest.json", json.dumps(manifest, indent=2, default=str))
        bundle.writestr(
            "tasks.csv",
            _csv_bytes(
                [
                    "task_id",
                    "outlet",
                    "title",
                    "status",
                    "priority",
                    "due_date",
                    "completed_at",
                    "score",
                    "checklist_status",
                    "failed_item_count",
                    "is_capa",
                ],
                task_rows,
            ),
        )
        bundle.writestr(
            "task_comments_audit.csv",
            _csv_bytes(
                ["comment_id", "task_id", "user_id", "event_type", "comment", "evidence_url", "created_at"],
                comment_rows,
            ),
        )
        bundle.writestr(
            "evidence_references.csv",
            _csv_bytes(
                [
                    "task_id",
                    "source_id",
                    "source_type",
                    "url",
                    "status",
                    "bundle_path",
                    "sha256",
                    "size_bytes",
                ],
                evidence_rows,
            ),
        )
        bundle.writestr("execution_sessions.json", json.dumps(sessions_payload, indent=2, default=str))
        for bundle_path, content in evidence_payloads:
            bundle.writestr(bundle_path, content)

    return buffer.getvalue()
