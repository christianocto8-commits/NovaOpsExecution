"""add form submission client_ref for idempotent offline sync

Revision ID: 20260806_0002
Revises: 20260806_0001
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260806_0002"
down_revision: Union[str, Sequence[str], None] = "20260806_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "form_submissions",
        sa.Column("client_ref", sa.String(length=80), nullable=True),
    )
    op.create_index(
        "ix_form_submissions_client_ref",
        "form_submissions",
        ["client_ref"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_form_submissions_client_ref", table_name="form_submissions")
    op.drop_column("form_submissions", "client_ref")
