"""add form template versions

Revision ID: 20260722_0004
Revises: 20260722_0003
Create Date: 2026-07-22 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260722_0004"
down_revision: Union[str, Sequence[str], None] = "20260722_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "form_template_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_template_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("snapshot_json", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["form_template_id"], ["form_templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_form_template_versions_form_template_id"),
        "form_template_versions",
        ["form_template_id"],
        unique=False,
    )
    op.create_index(
        "ix_form_template_versions_template_version",
        "form_template_versions",
        ["form_template_id", "version_number"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_form_template_versions_template_version", table_name="form_template_versions")
    op.drop_index(
        op.f("ix_form_template_versions_form_template_id"),
        table_name="form_template_versions",
    )
    op.drop_table("form_template_versions")
