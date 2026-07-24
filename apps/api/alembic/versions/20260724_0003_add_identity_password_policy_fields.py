"""Add identity password policy fields.

Revision ID: 20260724_0003
Revises: 20260724_0002
Create Date: 2026-07-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260724_0003"
down_revision: Union[str, Sequence[str], None] = "20260724_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "identity_users",
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "identity_users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "identity_users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("identity_users", "failed_login_count", server_default=None)


def downgrade() -> None:
    op.drop_column("identity_users", "password_changed_at")
    op.drop_column("identity_users", "locked_until")
    op.drop_column("identity_users", "failed_login_count")
