from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.execution_session import ExecutionSession
from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _actor_label(user: User | None, fallback_id: int | None = None) -> str:
    if user and user.name:
        return user.name
    if fallback_id is not None:
        return f"User {fallback_id}"
    return "System"


def _matches_actor(actor_query: str | None, actor_name: str) -> bool:
    if not actor_query:
        return True
    return actor_query.strip().lower() in actor_name.lower()


def _matches_outlet(outlet_query: str | None, outlet_name: str | None) -> bool:
    if not outlet_query:
        return True
    if not outlet_name:
        return False
    return outlet_query.strip().lower() in outlet_name.lower()


def list_audit_events(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
    actor: str | None = None,
    outlet_name: str | None = None,
    category: str | None = None,
    days: int = 30,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    since = datetime.now(timezone.utc) - timedelta(days=max(1, days))
    normalized_category = (category or "").strip().lower() or None
    events: list[dict] = []

    if normalized_category in {None, "task_comment"}:
        comment_query = (
            db.query(TaskComment)
            .options(
                joinedload(TaskComment.task).joinedload(Task.outlet),
            )
            .filter(TaskComment.created_at >= since)
            .order_by(TaskComment.created_at.desc())
        )

        if outlet_id is not None:
            comment_query = comment_query.join(Task).filter(Task.outlet_id == outlet_id)
        elif outlet_ids is not None:
            if not outlet_ids:
                comment_query = comment_query.filter(TaskComment.id == -1)
            else:
                comment_query = comment_query.join(Task).filter(Task.outlet_id.in_(outlet_ids))
        elif not all_outlets:
            comment_query = comment_query.filter(TaskComment.id == -1)

        comment_rows = comment_query.all()
        comment_user_ids = {comment.user_id for comment in comment_rows if comment.user_id}
        comment_users = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(comment_user_ids)).all()
        } if comment_user_ids else {}

        for comment in comment_rows:
            task = comment.task
            outlet = task.outlet if task else None
            actor_name = _actor_label(comment_users.get(comment.user_id), comment.user_id)

            if not _matches_actor(actor, actor_name):
                continue

            outlet_label = outlet.name if outlet else None
            if not _matches_outlet(outlet_name, outlet_label):
                continue

            action = comment.event_type or "comment"
            summary = comment.comment
            if comment.previous_value or comment.new_value:
                summary = (
                    f"{comment.comment} ({comment.previous_value or '-'} → {comment.new_value or '-'})"
                )

            events.append(
                {
                    "id": f"task-comment-{comment.id}",
                    "category": "task_comment",
                    "action": action,
                    "summary": summary,
                    "actor_name": actor_name,
                    "actor_id": comment.user_id,
                    "outlet_id": task.outlet_id if task else None,
                    "outlet_name": outlet.name if outlet else None,
                    "resource_type": "task",
                    "resource_id": str(task.id) if task else str(comment.task_id),
                    "occurred_at": _ensure_utc(comment.created_at),
                    "metadata": {
                        "task_title": task.title if task else None,
                        "event_type": action,
                    },
                }
            )

    if normalized_category in {None, "form_submission"}:
        submission_query = (
            db.query(FormSubmission)
            .options(joinedload(FormSubmission.form_template))
            .filter(FormSubmission.submitted_at.isnot(None))
            .filter(FormSubmission.submitted_at >= since)
            .order_by(FormSubmission.submitted_at.desc())
        )

        if outlet_id is not None:
            submission_query = submission_query.filter(FormSubmission.outlet_id == outlet_id)
        elif outlet_ids is not None:
            if not outlet_ids:
                submission_query = submission_query.filter(FormSubmission.id == -1)
            else:
                submission_query = submission_query.filter(
                    FormSubmission.outlet_id.in_(outlet_ids)
                )
        elif not all_outlets:
            submission_query = submission_query.filter(FormSubmission.id == -1)

        submission_rows = submission_query.all()
        submitter_ids = {row.submitted_by for row in submission_rows if row.submitted_by}
        submitters = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(submitter_ids)).all()
        } if submitter_ids else {}

        outlet_map = {
            outlet.id: outlet
            for outlet in db.query(Outlet)
            .filter(
                Outlet.id.in_({row.outlet_id for row in submission_rows if row.outlet_id})
            )
            .all()
        }

        for submission in submission_rows:
            actor_name = _actor_label(
                submitters.get(submission.submitted_by),
                submission.submitted_by,
            )
            if not _matches_actor(actor, actor_name):
                continue

            outlet_label = outlet.name if outlet else f"Outlet {submission.outlet_id}"
            if not _matches_outlet(outlet_name, outlet_label):
                continue

            template: FormTemplate | None = submission.form_template
            outlet = outlet_map.get(submission.outlet_id)
            responsible = submission.responsible_person_name
            summary = f"Form submitted: {template.title if template else submission.form_template_id}"
            if responsible:
                summary = f"{summary} (PIC: {responsible})"

            events.append(
                {
                    "id": f"form-submission-{submission.id}",
                    "category": "form_submission",
                    "action": submission.status or "submitted",
                    "summary": summary,
                    "actor_name": actor_name,
                    "actor_id": submission.submitted_by,
                    "outlet_id": submission.outlet_id,
                    "outlet_name": outlet.name if outlet else f"Outlet {submission.outlet_id}",
                    "resource_type": "form_submission",
                    "resource_id": str(submission.id),
                    "occurred_at": _ensure_utc(submission.submitted_at),
                    "metadata": {
                        "form_template_id": submission.form_template_id,
                        "form_template_title": template.title if template else None,
                        "score": submission.score,
                    },
                }
            )

    if normalized_category in {None, "execution_session"}:
        session_query = (
            db.query(ExecutionSession)
            .filter(ExecutionSession.status == "completed")
            .filter(ExecutionSession.submitted_at >= since)
            .order_by(ExecutionSession.submitted_at.desc())
        )

        session_rows = session_query.all()
        task_ids = {row.task_id for row in session_rows if row.task_id}
        tasks = {
            task.id: task
            for task in db.query(Task)
            .options(joinedload(Task.outlet))
            .filter(Task.id.in_(task_ids))
            .all()
        } if task_ids else {}

        if outlet_id is not None:
            session_rows = [
                row
                for row in session_rows
                if row.task_id and tasks.get(row.task_id) and tasks[row.task_id].outlet_id == outlet_id
            ]
        elif outlet_ids is not None:
            if not outlet_ids:
                session_rows = []
            else:
                session_rows = [
                    row
                    for row in session_rows
                    if row.task_id
                    and tasks.get(row.task_id)
                    and tasks[row.task_id].outlet_id in outlet_ids
                ]
        elif not all_outlets:
            session_rows = []

        submitter_ids = {row.submitted_by for row in session_rows if row.submitted_by}
        submitters = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(submitter_ids)).all()
        } if submitter_ids else {}

        for session in session_rows:
            task = tasks.get(session.task_id) if session.task_id else None
            outlet = task.outlet if task else None
            actor_name = _actor_label(
                submitters.get(session.submitted_by),
                session.submitted_by,
            )
            if not _matches_actor(actor, actor_name):
                continue

            outlet_label = outlet.name if outlet else None
            if not _matches_outlet(outlet_name, outlet_label):
                continue

            answers = session.answers_json if isinstance(session.answers_json, dict) else {}
            checklist = answers.get("_checklist") if isinstance(answers.get("_checklist"), dict) else {}
            checklist_status = checklist.get("status") if checklist else None
            score = checklist.get("score") if checklist else None

            events.append(
                {
                    "id": f"execution-session-{session.id}",
                    "category": "execution_session",
                    "action": "checklist_submitted",
                    "summary": (
                        f"Checklist submitted for {task.title if task else f'Task {session.task_id}'}"
                        + (f" — score {score}%" if score is not None else "")
                        + (f" ({checklist_status})" if checklist_status else "")
                    ),
                    "actor_name": actor_name,
                    "actor_id": session.submitted_by,
                    "outlet_id": task.outlet_id if task else None,
                    "outlet_name": outlet.name if outlet else None,
                    "resource_type": "execution_session",
                    "resource_id": str(session.id),
                    "occurred_at": _ensure_utc(session.submitted_at),
                    "metadata": {
                        "task_id": session.task_id,
                        "task_title": task.title if task else None,
                        "checklist_status": checklist_status,
                        "score": score,
                    },
                }
            )

    events = [event for event in events if event["occurred_at"] is not None]
    events.sort(key=lambda event: event["occurred_at"], reverse=True)
    total = len(events)
    paginated = events[offset : offset + limit]
    return paginated, total
