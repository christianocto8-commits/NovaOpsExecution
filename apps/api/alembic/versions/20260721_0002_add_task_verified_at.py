"""add task verified_at column

Revision ID: 20260721_0002
Revises: 20260721_0001
Create Date: 2026-07-21 12:05:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260721_0002"
down_revision: Union[str, Sequence[str], None] = "20260721_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "verified_at")
