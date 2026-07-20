"""add outlet region column

Revision ID: 20260720_0003
Revises: 20260720_0002
Create Date: 2026-07-20 17:40:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260720_0003"
down_revision: Union[str, Sequence[str], None] = "20260720_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("outlets", sa.Column("region", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("outlets", "region")
