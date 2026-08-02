"""finance shift deposits table + CAPA evidence fields

Revision ID: 20260802_0001
Revises: 20260731_0003
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260802_0001"
down_revision: Union[str, Sequence[str], None] = "20260731_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "finance_shift_deposits",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("form_submission_id", sa.Integer(), nullable=True),
        sa.Column("outlet_id", sa.String(length=64), nullable=True),
        sa.Column("outlet_name", sa.String(length=255), nullable=True),
        sa.Column("business_date", sa.String(length=32), nullable=False),
        sa.Column("shift_name", sa.String(length=64), nullable=False),
        sa.Column("department", sa.String(length=64), nullable=False, server_default="bar"),
        sa.Column("cashier_name", sa.String(length=150), nullable=True),
        sa.Column("cash_sales", sa.Float(), nullable=False, server_default="0"),
        sa.Column("qris_sales", sa.Float(), nullable=False, server_default="0"),
        sa.Column("edc_sales", sa.Float(), nullable=False, server_default="0"),
        sa.Column("expected_cash", sa.Float(), nullable=False, server_default="0"),
        sa.Column("actual_cash", sa.Float(), nullable=False, server_default="0"),
        sa.Column("deposit_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("variance_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("variance_reason", sa.Text(), nullable=True),
        sa.Column(
            "evidence_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="pending_review"),
        sa.Column("finance_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.String(length=64), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("corrective_task_id", sa.Integer(), nullable=True),
        sa.Column("submitted_by", sa.String(length=64), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_finance_shift_deposits_form_submission_id",
        "finance_shift_deposits",
        ["form_submission_id"],
        unique=False,
    )
    op.create_index(
        "ix_finance_shift_deposits_outlet_id",
        "finance_shift_deposits",
        ["outlet_id"],
        unique=False,
    )
    op.create_index(
        "ix_finance_shift_deposits_business_date",
        "finance_shift_deposits",
        ["business_date"],
        unique=False,
    )
    op.create_index(
        "ix_finance_shift_deposits_status",
        "finance_shift_deposits",
        ["status"],
        unique=False,
    )

    op.add_column("tasks", sa.Column("capa_root_cause", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("capa_before_evidence_url", sa.String(length=500), nullable=True))
    op.add_column("tasks", sa.Column("capa_after_evidence_url", sa.String(length=500), nullable=True))
    op.add_column("tasks", sa.Column("capa_evidence_note", sa.Text(), nullable=True))

    connection = op.get_bind()
    row = connection.execute(
        sa.text("SELECT payload FROM app_settings WHERE key = 'finance_shift_deposits'")
    ).fetchone()
    if not row or not row[0]:
        return

    try:
        items = json.loads(row[0])
    except json.JSONDecodeError:
        return

    if not isinstance(items, list):
        return

    insert = sa.text(
        """
        INSERT INTO finance_shift_deposits (
            id, form_submission_id, outlet_id, outlet_name, business_date, shift_name,
            department, cashier_name, cash_sales, qris_sales, edc_sales, expected_cash,
            actual_cash, deposit_amount, variance_amount, variance_reason, evidence_urls,
            status, finance_note, reviewed_by, reviewed_at, corrective_task_id,
            submitted_by, submitted_at
        ) VALUES (
            :id, :form_submission_id, :outlet_id, :outlet_name, :business_date, :shift_name,
            :department, :cashier_name, :cash_sales, :qris_sales, :edc_sales, :expected_cash,
            :actual_cash, :deposit_amount, :variance_amount, :variance_reason,
            CAST(:evidence_urls AS jsonb), :status, :finance_note, :reviewed_by,
            :reviewed_at, :corrective_task_id, :submitted_by, :submitted_at
        )
        ON CONFLICT (id) DO NOTHING
        """
    )

    for item in items:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        submitted_at = item.get("submitted_at") or datetime.now(timezone.utc).isoformat()
        evidence_urls = item.get("evidence_urls") or []
        if not isinstance(evidence_urls, list):
            evidence_urls = []
        connection.execute(
            insert,
            {
                "id": str(item["id"]),
                "form_submission_id": item.get("form_submission_id"),
                "outlet_id": item.get("outlet_id"),
                "outlet_name": item.get("outlet_name"),
                "business_date": item.get("business_date") or datetime.now(timezone.utc).date().isoformat(),
                "shift_name": item.get("shift_name") or "morning",
                "department": item.get("department") or "bar",
                "cashier_name": item.get("cashier_name"),
                "cash_sales": float(item.get("cash_sales") or 0),
                "qris_sales": float(item.get("qris_sales") or 0),
                "edc_sales": float(item.get("edc_sales") or 0),
                "expected_cash": float(item.get("expected_cash") or 0),
                "actual_cash": float(item.get("actual_cash") or 0),
                "deposit_amount": float(item.get("deposit_amount") or 0),
                "variance_amount": float(item.get("variance_amount") or 0),
                "variance_reason": item.get("variance_reason"),
                "evidence_urls": json.dumps(evidence_urls),
                "status": item.get("status") or "pending_review",
                "finance_note": item.get("finance_note"),
                "reviewed_by": item.get("reviewed_by"),
                "reviewed_at": item.get("reviewed_at"),
                "corrective_task_id": item.get("corrective_task_id"),
                "submitted_by": item.get("submitted_by"),
                "submitted_at": submitted_at,
            },
        )


def downgrade() -> None:
    op.drop_column("tasks", "capa_evidence_note")
    op.drop_column("tasks", "capa_after_evidence_url")
    op.drop_column("tasks", "capa_before_evidence_url")
    op.drop_column("tasks", "capa_root_cause")
    op.drop_index("ix_finance_shift_deposits_status", table_name="finance_shift_deposits")
    op.drop_index("ix_finance_shift_deposits_business_date", table_name="finance_shift_deposits")
    op.drop_index("ix_finance_shift_deposits_outlet_id", table_name="finance_shift_deposits")
    op.drop_index(
        "ix_finance_shift_deposits_form_submission_id",
        table_name="finance_shift_deposits",
    )
    op.drop_table("finance_shift_deposits")
