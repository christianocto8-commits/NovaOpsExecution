from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.task import Task
from app.modules.finance_handoff.schemas import (
    FinanceShiftDeposit,
    FinanceShiftDepositCreate,
    FinanceShiftDepositReview,
    FinanceSummary,
)
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, FINANCE_ROLE, OWNER_ROLE
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.modules.notifications.task_notifications import _area_manager_has_outlet_access, _resolve_identity_outlet
from app.modules.tasks.identity_bridge import resolve_legacy_outlet_id, sync_identity_access

router = APIRouter(prefix="/finance-handoff", tags=["Finance Handoff"])
FINANCE_DEPOSITS_KEY = "finance_shift_deposits"
DISCREPANCY_THRESHOLD = 50000.0
VALID_REVIEW_STATUS = {"approved", "rejected", "correction_requested", "pending_review"}
FINANCE_TEMPLATE_TYPE = "finance_shift_deposit"
logger = logging.getLogger(__name__)


def _load_deposits(db: Session) -> list[dict]:
    row = db.query(AppSettings).filter(AppSettings.key == FINANCE_DEPOSITS_KEY).first()
    if not row:
        return []
    try:
        payload = json.loads(row.payload)
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def _accessible_legacy_outlet_ids(
    db: Session,
    current_user: IdentityUser,
) -> tuple[set[str] | None, bool]:
    _legacy_user, outlet_ids, full_access = sync_identity_access(db, current_user)
    db.commit()
    if full_access:
        return None, True
    return {str(outlet_id) for outlet_id in outlet_ids}, False


def _filter_deposits_for_user(
    db: Session,
    current_user: IdentityUser,
    items: list[dict],
) -> list[dict]:
    outlet_ids, full_access = _accessible_legacy_outlet_ids(db, current_user)
    if full_access:
        return items
    if not outlet_ids:
        return []
    return [item for item in items if str(item.get("outlet_id")) in outlet_ids]


def _save_deposits(db: Session, items: list[dict]) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == FINANCE_DEPOSITS_KEY).first()
    payload = json.dumps(items, default=str)
    if row:
        row.payload = payload
    else:
        row = AppSettings(key=FINANCE_DEPOSITS_KEY, payload=payload)
    db.add(row)
    db.flush()


def _finance_template_fields() -> list[dict]:
    return [
        {"label": "Business Date", "field_type": "date", "is_required": True},
        {"label": "Shift Name", "field_type": "select", "is_required": True, "options_json": ["morning", "evening", "midnight"]},
        {"label": "Department", "field_type": "select", "is_required": True, "options_json": ["bar", "kitchen", "service", "cashier"]},
        {"label": "Cashier Name", "field_type": "text", "is_required": True},
        {"label": "Cash Sales", "field_type": "number", "is_required": True},
        {"label": "QRIS Sales", "field_type": "number", "is_required": False},
        {"label": "EDC Sales", "field_type": "number", "is_required": False},
        {"label": "Expected Cash", "field_type": "number", "is_required": True},
        {"label": "Actual Cash", "field_type": "number", "is_required": True},
        {"label": "Deposit Amount", "field_type": "number", "is_required": True},
        {"label": "Variance Reason", "field_type": "textarea", "is_required": False},
        {"label": "Deposit Evidence", "field_type": "file", "is_required": True},
    ]


def ensure_finance_shift_template(db: Session, current_user: IdentityUser) -> FormTemplate:
    template = (
        db.query(FormTemplate)
        .filter(FormTemplate.form_type == FINANCE_TEMPLATE_TYPE)
        .order_by(FormTemplate.id.asc())
        .first()
    )
    legacy_user, _, _ = sync_identity_access(db, current_user)
    if template is None:
        template = FormTemplate(
            title="Setoran Shift Finance",
            description="Form setoran per shift untuk kas, settlement non-cash, evidence, dan review Finance.",
            form_type=FINANCE_TEMPLATE_TYPE,
            outlet_id=None,
            created_by=legacy_user.id,
            is_active=True,
        )
        db.add(template)
        db.flush()

    desired_fields = _finance_template_fields()
    existing_fields = (
        db.query(FormField)
        .filter(FormField.form_template_id == template.id)
        .order_by(FormField.sort_order.asc())
        .all()
    )
    if not existing_fields:
        for index, field in enumerate(desired_fields):
            db.add(
                FormField(
                    form_template_id=template.id,
                    sort_order=index,
                    placeholder=None,
                    help_text="Finance Handoff",
                    validation_json=None,
                    **field,
                )
            )
    else:
        fields_by_label = {field.label.strip().lower(): field for field in existing_fields}
        for index, field_payload in enumerate(desired_fields):
            field = fields_by_label.get(str(field_payload["label"]).lower())
            if not field:
                db.add(
                    FormField(
                        form_template_id=template.id,
                        sort_order=index,
                        placeholder=None,
                        help_text="Finance Handoff",
                        validation_json=None,
                        **field_payload,
                    )
                )
                continue
            field.field_type = field_payload["field_type"]
            field.is_required = bool(field_payload["is_required"])
            field.options_json = field_payload.get("options_json")
            field.sort_order = index
            db.add(field)
    template.is_active = True
    template.form_type = FINANCE_TEMPLATE_TYPE
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def _user_has_outlet_access(
    user: IdentityUser,
    identity_outlet: IdentityOutlet | None,
) -> bool:
    if identity_outlet is None:
        return False
    if user.outlet_id == identity_outlet.id:
        return True
    return any(outlet.id == identity_outlet.id for outlet in user.assigned_outlets)


def _finance_recipients(db: Session, outlet_id: int | None) -> list[IdentityUser]:
    roles = db.scalars(
        select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE, FINANCE_ROLE, AREA_MANAGER_ROLE]))
    ).all()
    role_ids = [role.id for role in roles]
    if not role_ids:
        return []

    identity_outlet = _resolve_identity_outlet(db, outlet_id) if outlet_id else None
    recipients = db.scalars(
        select(IdentityUser).where(IdentityUser.is_active.is_(True), IdentityUser.role_id.in_(role_ids))
    ).all()
    scoped: list[IdentityUser] = []
    for user in recipients:
        role_slug = user.role.slug if user.role else ""
        if role_slug == AREA_MANAGER_ROLE and not _area_manager_has_outlet_access(user, identity_outlet):
            continue
        if role_slug == FINANCE_ROLE and not _user_has_outlet_access(user, identity_outlet):
            continue
        scoped.append(user)
    return scoped


def _notify_finance(
    db: Session,
    *,
    deposit: FinanceShiftDeposit,
    legacy_outlet_id: int | None,
    event_type: str,
    subject: str,
    body: str,
) -> int:
    sent = 0
    payload = {
        "deposit_id": deposit.id,
        "outlet_id": deposit.outlet_id,
        "business_date": deposit.business_date,
        "shift_name": deposit.shift_name,
        "variance_amount": deposit.variance_amount,
        "event_type": event_type,
    }
    for recipient in _finance_recipients(db, legacy_outlet_id):
        NotificationService(db).create_event(
            NotificationEventCreate(
                event_type=event_type,
                source_module="finance_handoff",
                source_entity_type="shift_deposit",
                source_entity_id=deposit.id,
                recipient_user_id=recipient.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )
        PushNotificationService(db).send_to_user(
            recipient.id,
            title=subject,
            body=body,
            url="/dashboard/finance-handoff",
            data=payload,
        )
        sent += 1
    return sent


def _create_corrective_task_if_needed(
    db: Session,
    *,
    deposit: FinanceShiftDeposit,
    current_user: IdentityUser,
    legacy_outlet_id: int | None,
) -> int | None:
    if abs(deposit.variance_amount) < DISCREPANCY_THRESHOLD or not legacy_outlet_id:
        return None
    legacy_user, _, _ = sync_identity_access(db, current_user)
    task = Task(
        title=f"Finance discrepancy: {deposit.department} {deposit.shift_name}",
        description=(
            f"Finance deposit variance {deposit.variance_amount:,.0f} for "
            f"{deposit.business_date} / {deposit.shift_name}. "
            f"Reason: {deposit.variance_reason or '-'}"
        ),
        outlet_id=legacy_outlet_id,
        assigned_to=None,
        created_by=legacy_user.id,
        source_type="finance_discrepancy",
        source_id=None,
        priority="high",
        status="open",
    )
    db.add(task)
    db.flush()
    return task.id


def _answer_value(answer) -> str:
    if answer.answer_text:
        return str(answer.answer_text)
    if answer.answer_number is not None:
        return str(answer.answer_number)
    if answer.answer_boolean is not None:
        return "yes" if answer.answer_boolean else "no"
    if answer.evidence_url:
        return str(answer.evidence_url)
    if answer.answer_json is not None:
        return json.dumps(answer.answer_json, default=str)
    return ""


def _as_float(value: str | None) -> float:
    if not value:
        return 0.0
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


def create_finance_deposit_from_form_submission(
    db: Session,
    *,
    submission: FormSubmission,
    template: FormTemplate | None,
    submitted_by_legacy_user_id: int,
    submitted_by_identity_user: IdentityUser | None = None,
) -> FinanceShiftDeposit | None:
    if not template or template.form_type != FINANCE_TEMPLATE_TYPE:
        return None

    items = _load_deposits(db)
    existing = next(
        (
            FinanceShiftDeposit(**item)
            for item in items
            if item.get("form_submission_id") == submission.id
        ),
        None,
    )
    if existing:
        return existing

    fields = {
        field.id: field.label.strip().lower()
        for field in db.query(FormField).filter(FormField.form_template_id == template.id).all()
    }
    values: dict[str, str] = {}
    evidence_urls: list[str] = []
    for answer in submission.answers:
        label = fields.get(answer.form_field_id, "").lower()
        value = _answer_value(answer)
        if label:
            values[label] = value
        if answer.evidence_url:
            evidence_urls.append(answer.evidence_url)
        if "evidence" in label and value:
            evidence_urls.append(value)

    expected_cash = _as_float(values.get("expected cash"))
    actual_cash = _as_float(values.get("actual cash"))
    variance = round(actual_cash - expected_cash, 2)
    outlet = db.get(Outlet, submission.outlet_id)
    deposit = FinanceShiftDeposit(
        id=uuid4().hex,
        form_submission_id=submission.id,
        outlet_id=str(submission.outlet_id),
        outlet_name=outlet.name if outlet else None,
        business_date=values.get("business date") or datetime.now(timezone.utc).date().isoformat(),
        shift_name=values.get("shift name") or "midnight",
        department=values.get("department") or "bar",
        cashier_name=values.get("cashier name"),
        cash_sales=_as_float(values.get("cash sales")),
        qris_sales=_as_float(values.get("qris sales")),
        edc_sales=_as_float(values.get("edc sales")),
        expected_cash=expected_cash,
        actual_cash=actual_cash,
        deposit_amount=_as_float(values.get("deposit amount")),
        variance_amount=variance,
        variance_reason=values.get("variance reason"),
        evidence_urls=sorted(set(evidence_urls)),
        submitted_by=str(submitted_by_legacy_user_id),
        submitted_at=datetime.now(timezone.utc),
    )

    if submitted_by_identity_user:
        corrective_task_id = _create_corrective_task_if_needed(
            db,
            deposit=deposit,
            current_user=submitted_by_identity_user,
            legacy_outlet_id=submission.outlet_id,
        )
        deposit.corrective_task_id = corrective_task_id

    items.append(deposit.model_dump(mode="json"))
    _save_deposits(db, items)
    return deposit


def notify_finance_deposit_submitted(
    db: Session,
    *,
    deposit: FinanceShiftDeposit,
    legacy_outlet_id: int | None,
) -> None:
    _notify_finance(
        db,
        deposit=deposit,
        legacy_outlet_id=legacy_outlet_id,
        event_type="finance_shift_deposit_submitted",
        subject=f"Setoran shift masuk: {deposit.department} {deposit.shift_name}",
        body=(
            f"Setoran {deposit.business_date} masuk ke Finance. "
            f"Deposit {deposit.deposit_amount:,.0f}, variance {deposit.variance_amount:,.0f}."
        ),
    )


@router.get("/deposits", response_model=list[FinanceShiftDeposit])
def list_deposits(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    items = _filter_deposits_for_user(db, current_user, _load_deposits(db))
    return [FinanceShiftDeposit(**item) for item in items]


@router.post("/ensure-shift-template")
def ensure_shift_template_endpoint(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("form.create")),
):
    template = ensure_finance_shift_template(db, current_user)
    return {"template_id": template.id, "title": template.title, "form_type": template.form_type}


@router.post("/deposits", response_model=FinanceShiftDeposit, status_code=status.HTTP_201_CREATED)
def create_deposit(
    payload: FinanceShiftDepositCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("form.submit")),
):
    variance = round(payload.actual_cash - payload.expected_cash, 2)
    legacy_outlet_id: int | None = None
    if payload.outlet_id:
        try:
            legacy_outlet_id = resolve_legacy_outlet_id(db, payload.outlet_id)
        except (TypeError, ValueError):
            legacy_outlet_id = None

    deposit = FinanceShiftDeposit(
        id=uuid4().hex,
        **payload.model_dump(),
        variance_amount=variance,
        submitted_by=str(current_user.id),
        submitted_at=datetime.now(timezone.utc),
    )
    corrective_task_id = _create_corrective_task_if_needed(
        db,
        deposit=deposit,
        current_user=current_user,
        legacy_outlet_id=legacy_outlet_id,
    )
    deposit.corrective_task_id = corrective_task_id
    items = _load_deposits(db)
    items.append(deposit.model_dump(mode="json"))
    _save_deposits(db, items)
    db.commit()

    try:
        notify_finance_deposit_submitted(
            db,
            deposit=deposit,
            legacy_outlet_id=legacy_outlet_id,
        )
    except Exception:
        logger.exception("Finance deposit %s was saved but notification delivery failed", deposit.id)
    return deposit


@router.patch("/deposits/{deposit_id}/review", response_model=FinanceShiftDeposit)
def review_deposit(
    deposit_id: str,
    payload: FinanceShiftDepositReview,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.export")),
):
    status_value = payload.status.strip().lower()
    if status_value not in VALID_REVIEW_STATUS:
        raise HTTPException(status_code=400, detail="Invalid finance review status")

    items = _load_deposits(db)
    accessible_outlet_ids, full_access = _accessible_legacy_outlet_ids(db, current_user)
    for index, item in enumerate(items):
        if item.get("id") == deposit_id:
            if not full_access and str(item.get("outlet_id")) not in (accessible_outlet_ids or set()):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User has no access to this finance deposit outlet",
                )
            deposit = FinanceShiftDeposit(**item)
            deposit.status = status_value
            deposit.finance_note = payload.finance_note
            deposit.reviewed_by = str(current_user.id)
            deposit.reviewed_at = datetime.now(timezone.utc)
            items[index] = deposit.model_dump(mode="json")
            _save_deposits(db, items)
            db.commit()
            return deposit
    raise HTTPException(status_code=404, detail="Finance deposit not found")


@router.get("/summary", response_model=FinanceSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_permission("report.read")),
):
    items = _filter_deposits_for_user(db, current_user, _load_deposits(db))
    deposits = [FinanceShiftDeposit(**item) for item in items]
    return FinanceSummary(
        pending_review=sum(1 for item in deposits if item.status == "pending_review"),
        approved=sum(1 for item in deposits if item.status == "approved"),
        rejected=sum(1 for item in deposits if item.status == "rejected"),
        correction_requested=sum(1 for item in deposits if item.status == "correction_requested"),
        total_deposit_amount=round(sum(item.deposit_amount for item in deposits), 2),
        total_variance_amount=round(sum(item.variance_amount for item in deposits), 2),
        discrepancy_count=sum(1 for item in deposits if abs(item.variance_amount) >= DISCREPANCY_THRESHOLD),
        discrepancy_threshold=DISCREPANCY_THRESHOLD,
    )
