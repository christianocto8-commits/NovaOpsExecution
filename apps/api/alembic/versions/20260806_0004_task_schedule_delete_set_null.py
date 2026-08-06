"""Allow deleting schedules that have already generated tasks.

Revision ID: 20260806_0004
Revises: 20260806_0003
Create Date: 2026-08-06 22:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260806_0004"
down_revision: Union[str, Sequence[str], None] = "20260806_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("fk_tasks_schedule_id", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "fk_tasks_schedule_id",
        "tasks",
        "task_schedules",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_schedule_id", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "fk_tasks_schedule_id",
        "tasks",
        "task_schedules",
        ["schedule_id"],
        ["id"],
    )
