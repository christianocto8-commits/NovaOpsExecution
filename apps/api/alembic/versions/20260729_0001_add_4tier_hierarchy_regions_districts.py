"""add 4-tier hierarchy: regions, districts, outlet/user scope FKs

Revision ID: 20260729_0001
Revises: 20260728_0001
Create Date: 2026-07-29 15:14:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260729_0001"
down_revision: Union[str, Sequence[str], None] = "20260728_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- identity_regions table ---
    op.create_table(
        "identity_regions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["identity_organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_identity_regions_organization_id", "identity_regions", ["organization_id"])
    op.create_index("ix_identity_regions_code", "identity_regions", ["code"], unique=True)

    # --- identity_districts table ---
    op.create_table(
        "identity_districts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["identity_organizations.id"]),
        sa.ForeignKeyConstraint(["region_id"], ["identity_regions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_identity_districts_organization_id", "identity_districts", ["organization_id"])
    op.create_index("ix_identity_districts_region_id", "identity_districts", ["region_id"])
    op.create_index("ix_identity_districts_code", "identity_districts", ["code"], unique=True)

    # --- Add region_id / district_id to identity_outlets ---
    op.add_column(
        "identity_outlets",
        sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "identity_outlets",
        sa.Column("district_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_identity_outlets_region_id",
        "identity_outlets", "identity_regions",
        ["region_id"], ["id"],
    )
    op.create_foreign_key(
        "fk_identity_outlets_district_id",
        "identity_outlets", "identity_districts",
        ["district_id"], ["id"],
    )
    op.create_index("ix_identity_outlets_region_id", "identity_outlets", ["region_id"])
    op.create_index("ix_identity_outlets_district_id", "identity_outlets", ["district_id"])

    # --- Add region_id / district_id to identity_users ---
    op.add_column(
        "identity_users",
        sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "identity_users",
        sa.Column("district_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_identity_users_region_id",
        "identity_users", "identity_regions",
        ["region_id"], ["id"],
    )
    op.create_foreign_key(
        "fk_identity_users_district_id",
        "identity_users", "identity_districts",
        ["district_id"], ["id"],
    )
    op.create_index("ix_identity_users_region_id", "identity_users", ["region_id"])
    op.create_index("ix_identity_users_district_id", "identity_users", ["district_id"])

    # --- Add new roles: regional_manager, district_manager ---
    op.execute("""
        INSERT INTO identity_roles (id, name, slug, description, created_at, updated_at)
        VALUES
          (gen_random_uuid(), 'Regional Manager', 'regional_manager', 'Manages multiple districts across a region', now(), now()),
          (gen_random_uuid(), 'District Manager', 'district_manager', 'Manages multiple outlets within a district', now(), now())
        ON CONFLICT (slug) DO NOTHING;
    """)


def downgrade() -> None:
    # Remove indexes and FKs from identity_users
    op.drop_index("ix_identity_users_district_id", "identity_users")
    op.drop_index("ix_identity_users_region_id", "identity_users")
    op.drop_constraint("fk_identity_users_district_id", "identity_users", type_="foreignkey")
    op.drop_constraint("fk_identity_users_region_id", "identity_users", type_="foreignkey")
    op.drop_column("identity_users", "district_id")
    op.drop_column("identity_users", "region_id")

    # Remove indexes and FKs from identity_outlets
    op.drop_index("ix_identity_outlets_district_id", "identity_outlets")
    op.drop_index("ix_identity_outlets_region_id", "identity_outlets")
    op.drop_constraint("fk_identity_outlets_district_id", "identity_outlets", type_="foreignkey")
    op.drop_constraint("fk_identity_outlets_region_id", "identity_outlets", type_="foreignkey")
    op.drop_column("identity_outlets", "district_id")
    op.drop_column("identity_outlets", "region_id")

    # Drop district and region tables (order matters due to FK)
    op.drop_index("ix_identity_districts_code", "identity_districts")
    op.drop_index("ix_identity_districts_region_id", "identity_districts")
    op.drop_index("ix_identity_districts_organization_id", "identity_districts")
    op.drop_table("identity_districts")

    op.drop_index("ix_identity_regions_code", "identity_regions")
    op.drop_index("ix_identity_regions_organization_id", "identity_regions")
    op.drop_table("identity_regions")

    # Remove new roles
    op.execute("""
        DELETE FROM identity_roles WHERE slug IN ('regional_manager', 'district_manager');
    """)
