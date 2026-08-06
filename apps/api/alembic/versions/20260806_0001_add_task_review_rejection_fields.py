"""add task review rejection fields (rejected_at, review_note)

Revision ID: 20260806_0001
Revises: 20260802_0002
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260806_0001"
down_revision: Union[str, Sequence[str], None] = "20260802_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tasks", sa.Column("review_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "review_note")
    op.drop_column("tasks", "rejected_at")
