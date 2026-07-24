"""Add login device session metadata.

Revision ID: 20260724_0001
Revises: 20260723_0003
Create Date: 2026-07-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260724_0001"
down_revision: Union[str, Sequence[str], None] = "20260723_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "identity_refresh_tokens",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "identity_refresh_tokens",
        sa.Column("device_label", sa.String(length=160), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("identity_refresh_tokens", "device_label")
    op.drop_column("identity_refresh_tokens", "last_seen_at")
