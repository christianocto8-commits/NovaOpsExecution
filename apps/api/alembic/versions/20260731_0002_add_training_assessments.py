"""add training assessments

Revision ID: 20260731_0002
Revises: 20260731_0001
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260731_0002"
down_revision = "20260731_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "training_modules",
        sa.Column("quiz_questions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "training_modules",
        sa.Column("passing_score", sa.Integer(), nullable=False, server_default="80"),
    )
    op.add_column("training_completions", sa.Column("score", sa.Integer(), nullable=True))
    op.add_column(
        "training_completions",
        sa.Column("passed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "training_completions",
        sa.Column("certificate_code", sa.String(length=80), nullable=True),
    )
    op.create_unique_constraint(
        "uq_training_completions_certificate_code",
        "training_completions",
        ["certificate_code"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_training_completions_certificate_code",
        "training_completions",
        type_="unique",
    )
    op.drop_column("training_completions", "certificate_code")
    op.drop_column("training_completions", "passed")
    op.drop_column("training_completions", "score")
    op.drop_column("training_modules", "passing_score")
    op.drop_column("training_modules", "quiz_questions")
