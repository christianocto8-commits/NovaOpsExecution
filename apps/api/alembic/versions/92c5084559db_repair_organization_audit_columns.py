from alembic import op
import sqlalchemy as sa

revision = "20260703_repair_org_audit"
down_revision = "20260703_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "updated_at")
    op.drop_column("organizations", "created_at")