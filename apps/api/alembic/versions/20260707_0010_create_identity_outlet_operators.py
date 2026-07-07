"""create identity outlet operators

Revision ID: 20260707_0010
Revises: 9c2f1d8b7a21
Create Date: 2026-07-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260707_0010"
down_revision: str | None = "9c2f1d8b7a21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "identity_outlet_operators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("position", sa.String(length=80), nullable=False),
        sa.Column("pin", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(
            ["outlet_id"],
            ["identity_outlets.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_identity_outlet_operators_outlet_id",
        "identity_outlet_operators",
        ["outlet_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_identity_outlet_operators_outlet_id",
        table_name="identity_outlet_operators",
    )
    op.drop_table("identity_outlet_operators")
