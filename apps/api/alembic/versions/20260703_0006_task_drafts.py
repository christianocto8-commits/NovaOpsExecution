"""add task drafts

Revision ID: 20260703_0006
Revises: 20260703_0005
Create Date: 2026-07-03
"""

from alembic import op
import sqlalchemy as sa


revision = "20260703_0006"
down_revision = "20260703_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_drafts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("outlet_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("assigned_to", sa.Integer(), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_type", sa.String(length=50), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_task_drafts_id"), "task_drafts", ["id"], unique=False)
    op.create_index(op.f("ix_task_drafts_outlet_id"), "task_drafts", ["outlet_id"], unique=False)
    op.create_index(op.f("ix_task_drafts_created_by"), "task_drafts", ["created_by"], unique=False)
    op.create_index(op.f("ix_task_drafts_assigned_to"), "task_drafts", ["assigned_to"], unique=False)
    op.create_index(op.f("ix_task_drafts_priority"), "task_drafts", ["priority"], unique=False)
    op.create_index(op.f("ix_task_drafts_status"), "task_drafts", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_task_drafts_status"), table_name="task_drafts")
    op.drop_index(op.f("ix_task_drafts_priority"), table_name="task_drafts")
    op.drop_index(op.f("ix_task_drafts_assigned_to"), table_name="task_drafts")
    op.drop_index(op.f("ix_task_drafts_created_by"), table_name="task_drafts")
    op.drop_index(op.f("ix_task_drafts_outlet_id"), table_name="task_drafts")
    op.drop_index(op.f("ix_task_drafts_id"), table_name="task_drafts")
    op.drop_table("task_drafts")
