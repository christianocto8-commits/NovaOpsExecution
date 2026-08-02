from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.modules.identity.models import Organization, Outlet, Permission, Role, User
from app.modules.identity.permissions import ROLE_PERMISSION_MAP, SYSTEM_ROLES
from app.modules.identity.security import hash_password

ROLE_NAMES = {
    "owner": "Owner",
    "admin": "Admin",
    "area_manager": "Area Manager",
    "outlet": "Outlet",
    "finance": "Finance Outlet",
    "finance_head_office": "Finance Head Office",
}

DEFAULT_ORGANIZATION_CODE = "NOVAOPS"
DEFAULT_OUTLET_CODE = "HQ"


def _get_or_create_permission(db: Session, code: str) -> Permission:
    permission = db.scalar(select(Permission).where(Permission.code == code))
    if permission:
        return permission

    permission = Permission(
        code=code,
        name=code.replace(".", " ").title(),
        description=f"Allows {code}",
    )
    db.add(permission)
    db.flush()
    return permission


def _get_or_create_role(db: Session, slug: str) -> Role:
    role = db.scalar(select(Role).where(Role.slug == slug))
    if role:
        return role

    role = Role(
        slug=slug,
        name=ROLE_NAMES.get(slug, slug.replace("_", " ").title()),
        description=f"System role: {slug}",
    )
    db.add(role)
    db.flush()
    return role


def _ensure_roles(db: Session) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for slug in SYSTEM_ROLES:
        role = _get_or_create_role(db, slug)
        role.permissions = [
            _get_or_create_permission(db, code)
            for code in ROLE_PERMISSION_MAP.get(slug, [])
        ]
        roles[slug] = role
    db.flush()
    return roles


def _ensure_organization(db: Session) -> Organization:
    organization = db.scalar(
        select(Organization).where(Organization.code == DEFAULT_ORGANIZATION_CODE)
    )
    if organization:
        return organization

    organization = Organization(
        code=DEFAULT_ORGANIZATION_CODE,
        name="NovaOps Enterprise",
        timezone="Asia/Jakarta",
        currency="IDR",
    )
    db.add(organization)
    db.flush()
    return organization


def _ensure_outlet(db: Session, organization_id) -> Outlet:
    outlet = db.scalar(select(Outlet).where(Outlet.code == DEFAULT_OUTLET_CODE))
    if outlet:
        if outlet.organization_id != organization_id:
            outlet.organization_id = organization_id
            db.add(outlet)
            db.flush()
        return outlet

    outlet = Outlet(
        organization_id=organization_id,
        code=DEFAULT_OUTLET_CODE,
        name="NovaOps HQ",
        address="Primary operating outlet",
        status="active",
    )
    db.add(outlet)
    db.flush()
    return outlet


def _find_bootstrap_user(db: Session, email: str, username: str) -> User | None:
    normalized_email = email.strip().lower()
    normalized_username = username.strip().lower()

    return db.scalar(
        select(User).where(
            or_(User.email == normalized_email, User.username == normalized_username)
        )
    )


def ensure_online_admin() -> None:
    settings = get_settings()
    if not settings.bootstrap_admin_enabled:
        return

    email = (settings.bootstrap_admin_email or "").strip().lower()
    username = (settings.bootstrap_admin_username or "").strip().lower()
    password = settings.bootstrap_admin_password or ""

    if not email or not username or not password:
        return

    db = SessionLocal()
    try:
        roles = _ensure_roles(db)
        organization = _ensure_organization(db)
        outlet = _ensure_outlet(db, organization.id)

        user = _find_bootstrap_user(db, email, username)
        if user is None:
            user = User(
                email=email,
                username=username,
                password_hash=hash_password(password),
                full_name="NovaOps Admin",
                role_id=roles["owner"].id,
                outlet_id=outlet.id,
                is_active=True,
            )
            db.add(user)
        else:
            user.email = email
            user.username = username
            user.password_hash = hash_password(password)
            user.full_name = user.full_name or "NovaOps Admin"
            user.role_id = roles["owner"].id
            user.outlet_id = outlet.id
            user.is_active = True
            db.add(user)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
