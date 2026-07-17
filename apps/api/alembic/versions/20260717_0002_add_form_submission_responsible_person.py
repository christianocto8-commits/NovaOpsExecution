"""add responsible person name to form submissions

Revision ID: 20260717_0002
Revises: 20260717_0001
Create Date: 2026-07-17 14:35:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260717_0002"
down_revision: Union[str, Sequence[str], None] = "20260717_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "form_submissions",
        sa.Column("responsible_person_name", sa.String(length=150), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("form_submissions", "responsible_person_name")
