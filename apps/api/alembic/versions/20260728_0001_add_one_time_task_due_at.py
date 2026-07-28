"""add one time task due at

Revision ID: 20260728_0001
Revises: 20260725_0001
Create Date: 2026-07-28
"""

from alembic import op
import sqlalchemy as sa


revision = "20260728_0001"
down_revision = "20260725_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("task_schedules", sa.Column("one_time_due_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("task_schedules", "one_time_due_at")
