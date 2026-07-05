"""fix user outlet role audit columns

Revision ID: 260705_uor_audit_cols
Revises: 20260703_repair_org_audit
Create Date: 2026-07-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "260705_uor_audit_cols"
down_revision: Union[str, None] = "20260703_repair_org_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("user_outlet_roles")}

    if "created_at" not in columns:
        op.add_column(
            "user_outlet_roles",
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    if "updated_at" not in columns:
        op.add_column(
            "user_outlet_roles",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("user_outlet_roles")}

    if "updated_at" in columns:
        op.drop_column("user_outlet_roles", "updated_at")

    if "created_at" in columns:
        op.drop_column("user_outlet_roles", "created_at")
