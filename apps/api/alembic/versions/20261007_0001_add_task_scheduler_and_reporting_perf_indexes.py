"""add task scheduler and reporting perf indexes

Revision ID: 20261007_0001
Revises: 20260829_0001
Create Date: 2026-10-07
"""
from alembic import op

revision = "20261007_0001"
down_revision = "20260829_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Task scheduler high frequency lookup indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_due_date ON tasks (due_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_status_due_date ON tasks (status, due_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_schedule_outlet ON tasks (schedule_id, outlet_id)")

    # Form submission analytics and reporting date range indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_outlet_created ON form_submissions (outlet_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_template_created ON form_submissions (form_template_id, created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_template_created")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_outlet_created")
    op.execute("DROP INDEX IF EXISTS ix_tasks_schedule_outlet")
    op.execute("DROP INDEX IF EXISTS ix_tasks_status_due_date")
    op.execute("DROP INDEX IF EXISTS ix_tasks_due_date")
