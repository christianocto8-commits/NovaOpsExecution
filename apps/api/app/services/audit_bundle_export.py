from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta, timezone
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session, joinedload

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.services.execution_validation import extract_evidence_urls


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
    for session in sessions:
        if session.task_id is not None and session.task_id not in session_by_task:
            session_by_task[session.task_id] = session

        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        for url in extract_evidence_urls(answers):
            evidence_rows.append([session.task_id or "", session.id, "execution_session", url])

    for comment in comments:
        if comment.evidence_url:
            evidence_rows.append([comment.task_id, comment.id, comment.event_type, comment.evidence_url])

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
        "contains_files": False,
        "notes": "Evidence files are referenced by URL. Runtime uploads are not embedded in this bundle.",
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
            _csv_bytes(["task_id", "source_id", "source_type", "url"], evidence_rows),
        )
        bundle.writestr("execution_sessions.json", json.dumps(sessions_payload, indent=2, default=str))

    return buffer.getvalue()
