"""add outlet geolocation columns

Revision ID: 20260720_0002
Revises: 20260720_0001
Create Date: 2026-07-20 15:55:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260720_0002"
down_revision: Union[str, Sequence[str], None] = "20260720_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("outlets", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("outlets", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("outlets", "longitude")
    op.drop_column("outlets", "latitude")
