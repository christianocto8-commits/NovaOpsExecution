"""add_schedule_exceptions_job_runs

Revision ID: 20260725_0001
Revises: 20260724_0003
Create Date: 2026-07-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260725_0001"
down_revision: Union[str, Sequence[str], None] = "20260724_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_schedule_exceptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("outlet_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_schedule_exceptions_date"), "task_schedule_exceptions", ["date"], unique=False)
    op.create_index(op.f("ix_task_schedule_exceptions_id"), "task_schedule_exceptions", ["id"], unique=False)
    op.create_index(op.f("ix_task_schedule_exceptions_outlet_id"), "task_schedule_exceptions", ["outlet_id"], unique=False)

    op.create_table(
        "scheduler_job_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scheduler_job_runs_id"), "scheduler_job_runs", ["id"], unique=False)
    op.create_index(op.f("ix_scheduler_job_runs_job_name"), "scheduler_job_runs", ["job_name"], unique=False)
    op.create_index(op.f("ix_scheduler_job_runs_started_at"), "scheduler_job_runs", ["started_at"], unique=False)
    op.create_index(op.f("ix_scheduler_job_runs_status"), "scheduler_job_runs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_scheduler_job_runs_status"), table_name="scheduler_job_runs")
    op.drop_index(op.f("ix_scheduler_job_runs_started_at"), table_name="scheduler_job_runs")
    op.drop_index(op.f("ix_scheduler_job_runs_job_name"), table_name="scheduler_job_runs")
    op.drop_index(op.f("ix_scheduler_job_runs_id"), table_name="scheduler_job_runs")
    op.drop_table("scheduler_job_runs")
    op.drop_index(op.f("ix_task_schedule_exceptions_outlet_id"), table_name="task_schedule_exceptions")
    op.drop_index(op.f("ix_task_schedule_exceptions_id"), table_name="task_schedule_exceptions")
    op.drop_index(op.f("ix_task_schedule_exceptions_date"), table_name="task_schedule_exceptions")
    op.drop_table("task_schedule_exceptions")
