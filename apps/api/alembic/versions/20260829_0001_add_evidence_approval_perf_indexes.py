"""add evidence approval perf indexes

Revision ID: 20260829_0001
Revises: 20260808_0001
Create Date: 2026-08-29
"""
from alembic import op

revision = "20260829_0001"
down_revision = "20260808_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use IF NOT EXISTS to be deploy-safe even if model indexes already created manually
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_status ON form_submissions (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_outlet_id ON form_submissions (outlet_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_form_template_id ON form_submissions (form_template_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_outlet_status ON form_submissions (outlet_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_form_submissions_template_status ON form_submissions (form_template_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_outlet_status ON tasks (outlet_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_status_created ON tasks (status, created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_tasks_status_created")
    op.execute("DROP INDEX IF EXISTS ix_tasks_outlet_status")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_template_status")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_outlet_status")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_form_template_id")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_outlet_id")
    op.execute("DROP INDEX IF EXISTS ix_form_submissions_status")
