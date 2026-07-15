"""add sop execution context

Revision ID: 20260715_0001
Revises: 1b095d82da02
Create Date: 2026-07-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260715_0001"
down_revision: Union[str, Sequence[str], None] = "1b095d82da02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("execution_sessions", sa.Column("task_id", sa.Integer(), nullable=True))
    op.add_column("execution_sessions", sa.Column("form_template_id", sa.Integer(), nullable=True))
    op.add_column("execution_sessions", sa.Column("source_type", sa.String(length=50), nullable=True))
    op.alter_column("execution_sessions", "runtime_template_id", existing_type=sa.Integer(), nullable=True)
    op.create_index(op.f("ix_execution_sessions_task_id"), "execution_sessions", ["task_id"], unique=False)
    op.create_index(
        op.f("ix_execution_sessions_form_template_id"),
        "execution_sessions",
        ["form_template_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_execution_sessions_task_id_tasks",
        "execution_sessions",
        "tasks",
        ["task_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_execution_sessions_form_template_id_form_templates",
        "execution_sessions",
        "form_templates",
        ["form_template_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_execution_sessions_form_template_id_form_templates",
        "execution_sessions",
        type_="foreignkey",
    )
    op.drop_constraint("fk_execution_sessions_task_id_tasks", "execution_sessions", type_="foreignkey")
    op.drop_index(op.f("ix_execution_sessions_form_template_id"), table_name="execution_sessions")
    op.drop_index(op.f("ix_execution_sessions_task_id"), table_name="execution_sessions")
    op.alter_column("execution_sessions", "runtime_template_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("execution_sessions", "source_type")
    op.drop_column("execution_sessions", "form_template_id")
    op.drop_column("execution_sessions", "task_id")