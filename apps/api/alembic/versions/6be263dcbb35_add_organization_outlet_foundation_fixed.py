"""add organization outlet foundation fixed

Revision ID: 6be263dcbb35
Revises:
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6be263dcbb35"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.UniqueConstraint("slug"),
    )

    op.add_column(
        "outlets",
        sa.Column("organization_id", sa.Integer(), nullable=True),
    )

    op.create_foreign_key(
        "fk_outlets_organization_id",
        "outlets",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.create_table(
        "user_outlet_roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("outlet_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"]),
        sa.UniqueConstraint("user_id", "outlet_id", name="uq_user_outlet_role"),
    )


def downgrade() -> None:
    op.drop_table("user_outlet_roles")
    op.drop_constraint("fk_outlets_organization_id", "outlets", type_="foreignkey")
    op.drop_column("outlets", "organization_id")
    op.drop_table("organizations")