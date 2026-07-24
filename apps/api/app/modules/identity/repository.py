from __future__ import annotations
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.models import (
    Organization,
    Outlet,
    OutletOperator,
    Permission,
    RefreshToken,
    Role,
    User,
)


def user_load_options():
    return (
        selectinload(User.role).selectinload(Role.permissions),
        selectinload(User.outlet),
        selectinload(User.assigned_outlets),
    )


class OrganizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def first(self) -> Organization | None:
        statement = select(Organization).order_by(Organization.created_at.asc())
        return self.db.scalar(statement)


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[User]:
        statement = (
            select(User)
            .options(*user_load_options())
            .order_by(User.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, user_id: UUID) -> User | None:
        statement = (
            select(User)
            .where(User.id == user_id)
            .options(*user_load_options())
        )
        return self.db.scalar(statement)

    def find_by_identifier(self, identifier: str) -> User | None:
        normalized = identifier.strip().lower()

        statement = (
            select(User)
            .where(or_(User.email == normalized, User.username == normalized))
            .options(*user_load_options())
        )
        return self.db.scalar(statement)

    def find_by_email(self, email: str) -> User | None:
        normalized = email.strip().lower()

        statement = (
            select(User)
            .where(User.email == normalized)
            .options(*user_load_options())
        )
        return self.db.scalar(statement)

    def email_or_username_exists(
        self,
        *,
        email: str,
        username: str,
        exclude_user_id: UUID | None = None,
    ) -> bool:
        statement = select(User).where(
            or_(
                User.email == email.strip().lower(),
                User.username == username.strip().lower(),
            )
        )

        if exclude_user_id:
            statement = statement.where(User.id != exclude_user_id)

        return self.db.scalar(statement) is not None

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return self.find_by_id(user.id) or user

    def update(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return self.find_by_id(user.id) or user

    def update_last_login(self, user: User) -> None:
        user.last_login = datetime.now(UTC)
        self.db.add(user)
        self.db.flush()


class RefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_label: str | None = None,
    ) -> RefreshToken:
        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            last_seen_at=datetime.now(UTC),
            device_label=device_label,
        )
        self.db.add(refresh_token)
        self.db.flush()
        self.db.refresh(refresh_token)
        return refresh_token

    def find_active_by_hash(self, token_hash: str) -> RefreshToken | None:
        statement = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(UTC),
        )
        return self.db.scalar(statement)

    def find_active_by_id_for_user(self, *, session_id: UUID, user_id: UUID) -> RefreshToken | None:
        statement = select(RefreshToken).where(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(UTC),
        )
        return self.db.scalar(statement)

    def list_active_for_user(self, user_id: UUID) -> list[RefreshToken]:
        statement = (
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(UTC),
            )
            .order_by(RefreshToken.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def touch(self, refresh_token: RefreshToken) -> None:
        refresh_token.last_seen_at = datetime.now(UTC)
        self.db.add(refresh_token)
        self.db.flush()

    def revoke(self, refresh_token: RefreshToken) -> None:
        refresh_token.revoked_at = datetime.now(UTC)
        self.db.add(refresh_token)
        self.db.flush()


class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Role]:
        statement = (
            select(Role)
            .options(selectinload(Role.permissions))
            .order_by(Role.slug.asc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, role_id: UUID) -> Role | None:
        statement = select(Role).where(Role.id == role_id)
        return self.db.scalar(statement)

    def find_by_slug(self, slug: str) -> Role | None:
        normalized = slug.strip().lower()
        statement = select(Role).where(Role.slug == normalized)
        return self.db.scalar(statement)


class PermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Permission]:
        statement = select(Permission).order_by(Permission.code.asc())
        return list(self.db.scalars(statement).all())


class OutletRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Outlet]:
        statement = select(Outlet).order_by(Outlet.code.asc())
        return list(self.db.scalars(statement).all())

    def find_by_id(self, outlet_id: UUID) -> Outlet | None:
        statement = select(Outlet).where(Outlet.id == outlet_id)
        return self.db.scalar(statement)

    def find_by_code(self, code: str) -> Outlet | None:
        normalized = code.strip().upper()
        statement = select(Outlet).where(Outlet.code == normalized)
        return self.db.scalar(statement)

    def code_exists(self, code: str, exclude_outlet_id: UUID | None = None) -> bool:
        statement = select(Outlet).where(Outlet.code == code.strip().upper())

        if exclude_outlet_id:
            statement = statement.where(Outlet.id != exclude_outlet_id)

        return self.db.scalar(statement) is not None

    def create(self, outlet: Outlet) -> Outlet:
        self.db.add(outlet)
        self.db.flush()
        self.db.refresh(outlet)
        return outlet

    def update(self, outlet: Outlet) -> Outlet:
        self.db.add(outlet)
        self.db.flush()
        self.db.refresh(outlet)
        return outlet



class OutletOperatorRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[OutletOperator]:
        statement = select(OutletOperator).order_by(OutletOperator.created_at.desc())
        return list(self.db.scalars(statement).all())

    def list_by_outlet(self, outlet_id: UUID) -> list[OutletOperator]:
        statement = (
            select(OutletOperator)
            .where(OutletOperator.outlet_id == outlet_id)
            .order_by(OutletOperator.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, operator_id: UUID) -> OutletOperator | None:
        statement = select(OutletOperator).where(OutletOperator.id == operator_id)
        return self.db.scalar(statement)

    def create(self, operator: OutletOperator) -> OutletOperator:
        self.db.add(operator)
        self.db.flush()
        self.db.refresh(operator)
        return operator

    def update(self, operator: OutletOperator) -> OutletOperator:
        self.db.add(operator)
        self.db.flush()
        self.db.refresh(operator)
        return operator
