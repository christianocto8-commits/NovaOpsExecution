"""add outlet operating hours columns

Revision ID: 20260723_0001
Revises: 20260722_0006
Create Date: 2026-07-23 06:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260723_0001"
down_revision: Union[str, Sequence[str], None] = "20260722_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "identity_outlets",
        sa.Column("operating_hours_open", sa.String(length=5), nullable=True),
    )
    op.add_column(
        "identity_outlets",
        sa.Column("operating_hours_close", sa.String(length=5), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("identity_outlets", "operating_hours_close")
    op.drop_column("identity_outlets", "operating_hours_open")
