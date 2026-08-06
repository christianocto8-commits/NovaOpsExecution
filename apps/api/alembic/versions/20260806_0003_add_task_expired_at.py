"""add task expired_at marker for auto-expired overdue tasks

Revision ID: 20260806_0003
Revises: 20260806_0002
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260806_0003"
down_revision: Union[str, Sequence[str], None] = "20260806_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE tasks
        SET expired_at = tc.created_at
        FROM task_comments AS tc
        WHERE tasks.status = 'cancelled'
          AND tasks.expired_at IS NULL
          AND tc.task_id = tasks.id
          AND tc.event_type = 'overdue_expired'
        """
    )


def downgrade() -> None:
    op.drop_column("tasks", "expired_at")
