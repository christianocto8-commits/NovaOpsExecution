"""add task schedules and recurring publish engine

Revision ID: 20260717_0001
Revises: 20260715_0001
Create Date: 2026-07-17 12:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260717_0001"
down_revision: Union[str, Sequence[str], None] = "20260715_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("form_template_id", sa.Integer(), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=False),
        sa.Column("recurrence", sa.String(length=20), nullable=False),
        sa.Column("shifts_json", sa.JSON(), nullable=False),
        sa.Column("outlet_ids_json", sa.JSON(), nullable=False),
        sa.Column("due_time", sa.String(length=5), nullable=False),
        sa.Column("weekly_publish_day", sa.String(length=20), nullable=True),
        sa.Column("auto_publish", sa.Boolean(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("last_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_publish_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["form_template_id"], ["form_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_schedules_id"), "task_schedules", ["id"], unique=False)

    op.add_column("tasks", sa.Column("schedule_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("shift", sa.String(length=50), nullable=True))
    op.create_index(op.f("ix_tasks_schedule_id"), "tasks", ["schedule_id"], unique=False)
    op.create_foreign_key(
        "fk_tasks_schedule_id",
        "tasks",
        "task_schedules",
        ["schedule_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_schedule_id", "tasks", type_="foreignkey")
    op.drop_index(op.f("ix_tasks_schedule_id"), table_name="tasks")
    op.drop_column("tasks", "shift")
    op.drop_column("tasks", "schedule_id")
    op.drop_index(op.f("ix_task_schedules_id"), table_name="task_schedules")
    op.drop_table("task_schedules")
