"""add incident and follow-up action lifecycle

Revision ID: 20260731_0001
Revises: 20260729_0001
Create Date: 2026-07-31 15:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260731_0001"
down_revision: Union[str, Sequence[str], None] = "20260729_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ops_incidents",
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=60), server_default="operational", nullable=False),
        sa.Column("severity", sa.String(length=30), server_default="medium", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="reported", nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column(
            "evidence_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(length=50), nullable=True),
        sa.Column("source_id", sa.String(length=80), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["outlet_id"], ["identity_outlets.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["identity_users.id"]),
        sa.ForeignKeyConstraint(["reporter_id"], ["identity_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("outlet_id", "reporter_id", "owner_id", "category", "severity", "status"):
        op.create_index(f"ix_ops_incidents_{column}", "ops_incidents", [column])

    op.create_table(
        "ops_follow_up_actions",
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="open", nullable=False),
        sa.Column("priority", sa.String(length=30), server_default="medium", nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_note", sa.Text(), nullable=True),
        sa.Column(
            "evidence_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(length=50), nullable=True),
        sa.Column("source_id", sa.String(length=80), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assignee_id"], ["identity_users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["identity_users.id"]),
        sa.ForeignKeyConstraint(["incident_id"], ["ops_incidents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["outlet_id"], ["identity_outlets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("incident_id", "outlet_id", "assignee_id", "status", "priority"):
        op.create_index(f"ix_ops_follow_up_actions_{column}", "ops_follow_up_actions", [column])


def downgrade() -> None:
    for column in ("incident_id", "outlet_id", "assignee_id", "status", "priority"):
        op.drop_index(f"ix_ops_follow_up_actions_{column}", table_name="ops_follow_up_actions")
    op.drop_table("ops_follow_up_actions")
    for column in ("outlet_id", "reporter_id", "owner_id", "category", "severity", "status"):
        op.drop_index(f"ix_ops_incidents_{column}", table_name="ops_incidents")
    op.drop_table("ops_incidents")
