"""add announcement scheduling

Revision ID: 20260731_0003
Revises: 20260731_0002
"""

from alembic import op
import sqlalchemy as sa


revision = "20260731_0003"
down_revision = "20260731_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_announcements_scheduled_at",
        "announcements",
        ["scheduled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_announcements_scheduled_at", table_name="announcements")
    op.drop_column("announcements", "scheduled_at")
