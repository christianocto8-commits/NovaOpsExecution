"""add publish_time for recurring schedules

Revision ID: 20260802_0002
Revises: 20260802_0001
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260802_0002"
down_revision: Union[str, Sequence[str], None] = "20260802_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "task_schedules",
        sa.Column("publish_time", sa.String(length=5), nullable=True),
    )
    # Existing due_time was used as publish gate — preserve that as publish_time.
    op.execute(
        sa.text(
            "UPDATE task_schedules SET publish_time = COALESCE(due_time, '09:00') "
            "WHERE publish_time IS NULL"
        )
    )
    op.alter_column(
        "task_schedules",
        "publish_time",
        existing_type=sa.String(length=5),
        nullable=False,
        server_default="09:00",
    )


def downgrade() -> None:
    op.drop_column("task_schedules", "publish_time")
