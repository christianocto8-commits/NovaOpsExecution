"""add task assignments

Revision ID: 20260703_0005
Revises: ae991a05c7da
Create Date: 2026-07-03
"""

from alembic import op
import sqlalchemy as sa


revision = "20260703_0005"
down_revision = "ae991a05c7da"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "user_id", name="uq_task_assignments_task_user"),
    )

    op.create_index(op.f("ix_task_assignments_id"), "task_assignments", ["id"], unique=False)
    op.create_index(op.f("ix_task_assignments_task_id"), "task_assignments", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_assignments_user_id"), "task_assignments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_task_assignments_user_id"), table_name="task_assignments")
    op.drop_index(op.f("ix_task_assignments_task_id"), table_name="task_assignments")
    op.drop_index(op.f("ix_task_assignments_id"), table_name="task_assignments")
    op.drop_table("task_assignments")