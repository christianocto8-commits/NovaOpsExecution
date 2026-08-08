"""add food prep labels and haccp log entries

Revision ID: 20260808_0001
Revises: 20260806_0004
Create Date: 2026-08-08 10:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260808_0001"
down_revision: Union[str, Sequence[str], None] = "20260806_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_prep_labels",
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("item_name", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=60), server_default="other", nullable=False),
        sa.Column("batch_code", sa.String(length=80), nullable=True),
        sa.Column("quantity_text", sa.String(length=60), nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("prepared_notes", sa.Text(), nullable=True),
        sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("discard_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("shelf_hours", sa.Integer(), nullable=True),
        sa.Column("discarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["identity_users.id"]),
        sa.ForeignKeyConstraint(["outlet_id"], ["identity_outlets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("outlet_id", "category", "discard_at"):
        op.create_index(f"ix_food_prep_labels_{column}", "food_prep_labels", [column])

    op.create_table(
        "haccp_log_entries",
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ccp_name", sa.String(length=120), nullable=False),
        sa.Column("item_name", sa.String(length=180), nullable=True),
        sa.Column("reading_value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=20), server_default="C", nullable=False),
        sa.Column("target_min", sa.Float(), nullable=True),
        sa.Column("target_max", sa.Float(), nullable=True),
        sa.Column("passed", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("corrective_action", sa.Text(), nullable=True),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=30), server_default="manual", nullable=False),
        sa.Column("sensor_reading_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["identity_users.id"]),
        sa.ForeignKeyConstraint(["outlet_id"], ["identity_outlets.id"]),
        sa.ForeignKeyConstraint(
            ["sensor_reading_id"],
            ["iot_sensor_readings.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("outlet_id", "ccp_name", "passed", "recorded_at"):
        op.create_index(f"ix_haccp_log_entries_{column}", "haccp_log_entries", [column])


def downgrade() -> None:
    for column in ("outlet_id", "ccp_name", "passed", "recorded_at"):
        op.drop_index(f"ix_haccp_log_entries_{column}", table_name="haccp_log_entries")
    op.drop_table("haccp_log_entries")
    for column in ("outlet_id", "category", "discard_at"):
        op.drop_index(f"ix_food_prep_labels_{column}", table_name="food_prep_labels")
    op.drop_table("food_prep_labels")