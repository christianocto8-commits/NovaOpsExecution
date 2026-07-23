"""add read_at to notification_deliveries

Revision ID: 20260723_0003
Revises: 20260723_0002
Create Date: 2026-07-23 18:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260723_0003"
down_revision: Union[str, Sequence[str], None] = "20260723_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notification_deliveries",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_deliveries", "read_at")
