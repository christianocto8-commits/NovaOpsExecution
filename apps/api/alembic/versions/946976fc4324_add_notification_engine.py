"""add notification engine

Revision ID: 946976fc4324
Revises: efdfce4fb16a
Create Date: 2026-07-07 17:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "946976fc4324"
down_revision: Union[str, Sequence[str], None] = "efdfce4fb16a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


notification_channel_enum = postgresql.ENUM(
    "in_app",
    "email",
    "push",
    name="notificationchannel",
    create_type=False,
)

notification_status_enum = postgresql.ENUM(
    "pending",
    "sent",
    "failed",
    "cancelled",
    name="notificationstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    notification_channel_enum.create(bind, checkfirst=True)
    notification_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "notification_templates",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("channel", notification_channel_enum, nullable=False),
        sa.Column("subject_template", sa.String(length=255), nullable=True),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_notification_templates_code"), "notification_templates", ["code"], unique=False)

    op.create_table(
        "notification_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("source_module", sa.String(length=120), nullable=False),
        sa.Column("source_entity_type", sa.String(length=120), nullable=True),
        sa.Column("source_entity_id", sa.String(length=120), nullable=True),
        sa.Column("template_code", sa.String(length=120), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["identity_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notification_events_event_type"), "notification_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_notification_events_source_module"), "notification_events", ["source_module"], unique=False)

    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column("recipient_user_id", sa.UUID(), nullable=True),
        sa.Column("recipient_role_id", sa.UUID(), nullable=True),
        sa.Column("channel", notification_channel_enum, nullable=False),
        sa.Column("status", notification_status_enum, nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["notification_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_role_id"], ["identity_roles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["identity_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notification_deliveries_event_id"), "notification_deliveries", ["event_id"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_recipient_role_id"), "notification_deliveries", ["recipient_role_id"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_recipient_user_id"), "notification_deliveries", ["recipient_user_id"], unique=False)
    op.create_index(op.f("ix_notification_deliveries_status"), "notification_deliveries", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_deliveries_status"), table_name="notification_deliveries")
    op.drop_index(op.f("ix_notification_deliveries_recipient_user_id"), table_name="notification_deliveries")
    op.drop_index(op.f("ix_notification_deliveries_recipient_role_id"), table_name="notification_deliveries")
    op.drop_index(op.f("ix_notification_deliveries_event_id"), table_name="notification_deliveries")
    op.drop_table("notification_deliveries")

    op.drop_index(op.f("ix_notification_events_source_module"), table_name="notification_events")
    op.drop_index(op.f("ix_notification_events_event_type"), table_name="notification_events")
    op.drop_table("notification_events")

    op.drop_index(op.f("ix_notification_templates_code"), table_name="notification_templates")
    op.drop_table("notification_templates")

    bind = op.get_bind()
    notification_status_enum.drop(bind, checkfirst=True)
    notification_channel_enum.drop(bind, checkfirst=True)
