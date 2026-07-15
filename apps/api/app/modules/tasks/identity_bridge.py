from uuid import UUID

from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.outlet import Outlet
from app.models.role import Role
from app.models.user import User
from app.models.user_outlet_role import UserOutletRole
from app.modules.identity.models import Organization as IdentityOrganization
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import User as IdentityUser


def get_identity_user(db: Session, user_id: UUID) -> IdentityUser | None:
    return db.query(IdentityUser).filter(IdentityUser.id == user_id).first()


def get_identity_user_by_email(db: Session, email: str) -> IdentityUser | None:
    return db.query(IdentityUser).filter(IdentityUser.email == email).first()


def get_identity_outlet(db: Session, outlet_id: UUID) -> IdentityOutlet | None:
    return db.query(IdentityOutlet).filter(IdentityOutlet.id == outlet_id).first()


def get_or_create_legacy_role(db: Session, identity_user: IdentityUser | None = None) -> Role:
    role_name = identity_user.role.name if identity_user and identity_user.role else "Administrator"

    role = db.query(Role).filter(Role.name == role_name).first()
    if role:
        return role

    role = Role(name=role_name, description="Synced from identity account")
    db.add(role)
    db.flush()
    return role


def get_or_create_legacy_organization(
    db: Session,
    identity_organization: IdentityOrganization | None = None,
) -> Organization:
    slug = (identity_organization.code if identity_organization else "novaops").strip().lower()
    name = identity_organization.name if identity_organization else "NovaOps"

    organization = db.query(Organization).filter(Organization.slug == slug).first()
    if organization:
        return organization

    organization = Organization(name=name, slug=slug)
    db.add(organization)
    db.flush()
    return organization


def get_or_create_legacy_outlet(db: Session, identity_outlet: IdentityOutlet) -> Outlet:
    code = identity_outlet.code.strip().upper()

    outlet = db.query(Outlet).filter(Outlet.code == code).first()
    if outlet:
        outlet.name = identity_outlet.name
        outlet.address = identity_outlet.address
        outlet.is_active = identity_outlet.status == "active"
        db.flush()
        return outlet

    organization = get_or_create_legacy_organization(db, identity_outlet.organization)
    outlet = Outlet(
        organization_id=organization.id,
        name=identity_outlet.name,
        code=code,
        address=identity_outlet.address,
        is_active=identity_outlet.status == "active",
    )
    db.add(outlet)
    db.flush()
    return outlet


def ensure_legacy_membership(
    db: Session,
    user: User,
    outlet: Outlet,
    identity_user: IdentityUser | None = None,
) -> None:
    membership = (
        db.query(UserOutletRole)
        .filter(UserOutletRole.user_id == user.id, UserOutletRole.outlet_id == outlet.id)
        .first()
    )

    if membership:
        return

    role_slug = identity_user.role.slug if identity_user and identity_user.role else "admin"
    db.add(
        UserOutletRole(
            user_id=user.id,
            organization_id=outlet.organization_id,
            outlet_id=outlet.id,
            role=role_slug,
        )
    )
    db.flush()


def sync_legacy_user(
    db: Session,
    identity_user: IdentityUser,
    outlet: Outlet | None = None,
) -> User:
    role = get_or_create_legacy_role(db, identity_user)
    user = db.query(User).filter(User.email == identity_user.email).first()

    if not user:
        user = User(
            name=identity_user.full_name,
            email=identity_user.email,
            password_hash=identity_user.password_hash,
            role_id=role.id,
            outlet_id=outlet.id if outlet else None,
            is_active=identity_user.is_active,
        )
        db.add(user)
        db.flush()
    else:
        user.name = identity_user.full_name
        user.password_hash = identity_user.password_hash
        user.role_id = role.id
        user.is_active = identity_user.is_active
        if outlet:
            user.outlet_id = outlet.id
        db.flush()

    if outlet:
        ensure_legacy_membership(db, user, outlet, identity_user)

    return user


def get_default_identity_outlet(identity_user: IdentityUser) -> IdentityOutlet | None:
    if identity_user.outlet:
        return identity_user.outlet
    if identity_user.assigned_outlets:
        return identity_user.assigned_outlets[0]
    return None


def get_accessible_identity_outlets(db: Session, identity_user: IdentityUser) -> tuple[list[IdentityOutlet], bool]:
    role_slug = identity_user.role.slug if identity_user.role else ""

    if role_slug in {"owner", "admin"}:
        return db.query(IdentityOutlet).order_by(IdentityOutlet.code.asc()).all(), True

    if role_slug == "area_manager":
        return list(identity_user.assigned_outlets), False

    outlet = get_default_identity_outlet(identity_user)
    return ([outlet] if outlet else []), False


def sync_identity_access(db: Session, identity_user: IdentityUser) -> tuple[User, list[int], bool]:
    identity_outlets, full_access = get_accessible_identity_outlets(db, identity_user)
    legacy_outlets = [get_or_create_legacy_outlet(db, outlet) for outlet in identity_outlets]
    primary_outlet = legacy_outlets[0] if legacy_outlets else None
    legacy_user = sync_legacy_user(db, identity_user, primary_outlet)

    for outlet in legacy_outlets:
        ensure_legacy_membership(db, legacy_user, outlet, identity_user)

    return legacy_user, [outlet.id for outlet in legacy_outlets], full_access


def resolve_legacy_outlet_id(db: Session, outlet_id: str) -> int:
    try:
        return int(outlet_id)
    except (TypeError, ValueError):
        pass

    identity_outlet = get_identity_outlet(db, UUID(outlet_id))
    if not identity_outlet:
        raise ValueError("Identity outlet not found")

    return get_or_create_legacy_outlet(db, identity_outlet).id
