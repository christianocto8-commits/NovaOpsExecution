from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


role_permissions = Table(
    "identity_role_permissions",
    Base.metadata,
    Column("role_id", PG_UUID(as_uuid=True), ForeignKey("identity_roles.id"), primary_key=True),
    Column("permission_id", PG_UUID(as_uuid=True), ForeignKey("identity_permissions.id"), primary_key=True),
)

user_outlets = Table(
    "identity_user_outlets",
    Base.metadata,
    Column("user_id", PG_UUID(as_uuid=True), ForeignKey("identity_users.id", ondelete="CASCADE"), primary_key=True),
    Column("outlet_id", PG_UUID(as_uuid=True), ForeignKey("identity_outlets.id", ondelete="CASCADE"), primary_key=True),
)

class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_organizations"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Jakarta", nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="IDR", nullable=False)

    outlets: Mapped[list["Outlet"]] = relationship(back_populates="organization")


class Outlet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_outlets"

    organization_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_organizations.id"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="outlets")
    users: Mapped[list["User"]] = relationship(back_populates="outlet", foreign_keys="User.outlet_id")


class Permission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_permissions"

    code: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_roles"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    permissions: Mapped[list[Permission]] = relationship(
        secondary=role_permissions,
        lazy="selectin",
    )


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)

    role_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_roles.id"),
        nullable=False,
        index=True,
    )
    outlet_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_outlets.id"),
        nullable=True,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    role: Mapped[Role] = relationship(lazy="selectin")
    outlet: Mapped[Outlet | None] = relationship(back_populates="users", foreign_keys=[outlet_id])
    assigned_outlets: Mapped[list[Outlet]] = relationship(
        secondary=user_outlets,
        lazy="selectin",
    )


class RefreshToken(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_refresh_tokens"

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_users.id"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship()


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "identity_audit_logs"

    actor_user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_users.id"),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_organizations.id"),
        nullable=True,
        index=True,
    )
    outlet_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_outlets.id"),
        nullable=True,
        index=True,
    )

    action: Mapped[str] = mapped_column(String(120), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(120), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

