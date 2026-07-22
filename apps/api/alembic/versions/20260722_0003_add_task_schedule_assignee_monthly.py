"""add task schedule assignee and monthly publish day

Revision ID: 20260722_0003
Revises: 20260722_0002
Create Date: 2026-07-22 10:15:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260722_0003"
down_revision: Union[str, Sequence[str], None] = "20260722_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_schedules", sa.Column("assigned_to", sa.Integer(), nullable=True))
    op.add_column("task_schedules", sa.Column("monthly_publish_day", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_task_schedules_assigned_to_users",
        "task_schedules",
        "users",
        ["assigned_to"],
        ["id"],
    )
    op.create_index(
        op.f("ix_task_schedules_assigned_to"),
        "task_schedules",
        ["assigned_to"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_task_schedules_assigned_to"), table_name="task_schedules")
    op.drop_constraint("fk_task_schedules_assigned_to_users", "task_schedules", type_="foreignkey")
    op.drop_column("task_schedules", "monthly_publish_day")
    op.drop_column("task_schedules", "assigned_to")
