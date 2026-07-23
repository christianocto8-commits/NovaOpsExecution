from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.models.user import User


def _latest_checklist_by_task(db: Session, task_ids: list[int]) -> dict[int, dict]:
    if not task_ids:
        return {}

    sessions = (
        db.query(ExecutionSession)
        .filter(
            ExecutionSession.task_id.in_(task_ids),
            ExecutionSession.status == "completed",
        )
        .order_by(ExecutionSession.task_id.asc(), ExecutionSession.id.desc())
        .all()
    )

    latest: dict[int, dict] = {}
    for session in sessions:
        if session.task_id in latest:
            continue
        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        checklist = answers.get("_checklist")
        if isinstance(checklist, dict):
            latest[session.task_id] = checklist

    return latest


def _format_failed_items(checklist: dict | None) -> str:
    if not checklist:
        return ""

    failed_items = checklist.get("failed_items") or []
    if not isinstance(failed_items, list) or not failed_items:
        return ""

    parts: list[str] = []
    for item in failed_items:
        if not isinstance(item, dict):
            continue
        label = item.get("label") or "Unknown"
        reason = item.get("reason") or "Failed"
        parts.append(f"{label} ({reason})")

    return "; ".join(parts)


def _pass_fail_label(
    checklist: dict | None,
    task_status: str,
    due_date: datetime | None = None,
) -> str:
    if checklist:
        status = checklist.get("status")
        if status == "pass":
            return "Pass"
        if status == "attention":
            return "Attention"
        if status == "fail":
            return "Fail"

    if task_status == "completed":
        return "Completed"
    if due_date:
        normalized_due = due_date
        if normalized_due.tzinfo is None:
            normalized_due = normalized_due.replace(tzinfo=timezone.utc)
        if normalized_due < datetime.now(timezone.utc):
            return "Overdue"
    if task_status == "cancelled":
        return "Cancelled"
    return "Pending"


def _format_date(value: datetime | None) -> str:
    if not value:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _query_tasks_for_export(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
) -> list[Task]:
    query = (
        db.query(Task)
        .options(joinedload(Task.outlet))
        .order_by(Task.id.asc())
    )

    if outlet_id is not None:
        query = query.filter(Task.outlet_id == outlet_id)
    elif outlet_ids is not None:
        if not outlet_ids:
            query = query.filter(Task.id == -1)
        else:
            query = query.filter(Task.outlet_id.in_(outlet_ids))
    elif not all_outlets:
        query = query.filter(Task.id == -1)

    return query.all()


def _build_export_rows(
    db: Session,
    tasks: list[Task],
) -> list[list[str | int | float]]:
    task_ids = [task.id for task in tasks]
    checklist_map = _latest_checklist_by_task(db, task_ids)

    assignee_ids = {task.assigned_to for task in tasks if task.assigned_to}
    assignees: dict[int, User] = {}
    if assignee_ids:
        assignees = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(assignee_ids)).all()
        }

    rows: list[list[str | int | float]] = []
    for task in tasks:
        checklist = checklist_map.get(task.id)
        assignee = assignees.get(task.assigned_to) if task.assigned_to else None
        outlet_name = task.outlet.name if task.outlet else f"Outlet {task.outlet_id}"
        event_date = task.completed_at or task.updated_at

        rows.append(
            [
                outlet_name,
                task.title,
                _format_date(event_date),
                checklist.get("score") if checklist else "",
                _pass_fail_label(checklist, task.status, task.due_date),
                _format_failed_items(checklist),
                assignee.name if assignee else "",
                task.id,
                task.status,
                _format_date(task.due_date),
            ]
        )

    return rows


def build_compliance_export_xlsx(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
) -> bytes:
    tasks = _query_tasks_for_export(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
    )

    headers = [
        "Outlet",
        "Task Title",
        "Date",
        "Score",
        "Pass/Fail",
        "Failed Items",
        "Assignee",
        "Task ID",
        "Status",
        "Due Date",
    ]

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Compliance Export"
    sheet.append(headers)
    for cell in sheet[1]:
        cell.font = Font(bold=True)

    for row in _build_export_rows(db, tasks):
        sheet.append(row)

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def build_compliance_export_pdf(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
) -> bytes:
    tasks = _query_tasks_for_export(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
    )

    headers = [
        "Outlet",
        "Task",
        "Date",
        "Score",
        "Pass/Fail",
        "Failed Items",
        "Assignee",
        "Task ID",
        "Status",
    ]
    data_rows = _build_export_rows(db, tasks)
    table_data = [headers] + [
        [
            str(row[0]),
            str(row[1]),
            str(row[2]),
            str(row[3]),
            str(row[4]),
            str(row[5])[:80],
            str(row[6]),
            str(row[7]),
            str(row[8]),
        ]
        for row in data_rows
    ]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("NovaOps Compliance Export", styles["Title"]),
        Paragraph(
            f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        ),
        Spacer(1, 8),
    ]

    if not data_rows:
        story.append(Paragraph("No compliance records found for the selected scope.", styles["Normal"]))
    else:
        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#047857")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ]
            )
        )
        story.append(table)

    doc.build(story)
    return buffer.getvalue()
