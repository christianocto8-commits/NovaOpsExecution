"""create identity user outlets assignment table

Revision ID: 9c2f1d8b7a21
Revises: 6f6f39c705e4
Create Date: 2026-07-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "9c2f1d8b7a21"
down_revision = "6f6f39c705e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "identity_user_outlets",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("outlet_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["identity_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["outlet_id"], ["identity_outlets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "outlet_id"),
    )


def downgrade() -> None:
    op.drop_table("identity_user_outlets")
