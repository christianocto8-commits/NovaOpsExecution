from app.core.database import SessionLocal
from app.models.organization import Organization
from app.models.outlet import Outlet
from app.models.role import Role
from app.models.user import User
from app.models.user_outlet_role import UserOutletRole
from app.modules.identity.models import Organization as IdentityOrganization
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import User as IdentityUser


def get_or_create_role(db):
    role = db.query(Role).filter(Role.name == "Administrator").first()
    if role:
        return role

    role = Role(name="Administrator", description="Synced from identity user for SOP task engine")
    db.add(role)
    db.flush()
    return role


def get_or_create_organization(db):
    identity_org = db.query(IdentityOrganization).order_by(IdentityOrganization.created_at.asc()).first()
    name = identity_org.name if identity_org else "NovaOps"
    slug = identity_org.code.lower() if identity_org else "novaops"

    organization = db.query(Organization).filter(Organization.slug == slug).first()
    if organization:
        return organization

    organization = Organization(name=name, slug=slug)
    db.add(organization)
    db.flush()
    return organization


def get_or_create_outlet(db, organization):
    identity_outlet = db.query(IdentityOutlet).order_by(IdentityOutlet.created_at.asc()).first()
    code = identity_outlet.code if identity_outlet else "HQ"
    name = identity_outlet.name if identity_outlet else "Head Office"
    address = identity_outlet.address if identity_outlet else None

    outlet = db.query(Outlet).filter(Outlet.code == code).first()
    if outlet:
        return outlet

    outlet = Outlet(
        organization_id=organization.id,
        name=name,
        code=code,
        address=address,
        is_active=True,
    )
    db.add(outlet)
    db.flush()
    return outlet


def sync_users(db, role, outlet, organization):
    synced = 0
    identity_users = db.query(IdentityUser).order_by(IdentityUser.email.asc()).all()

    for identity_user in identity_users:
        user = db.query(User).filter(User.email == identity_user.email).first()

        if not user:
            user = User(
                name=identity_user.full_name,
                email=identity_user.email,
                password_hash=identity_user.password_hash,
                role_id=role.id,
                outlet_id=outlet.id,
                is_active=identity_user.is_active,
            )
            db.add(user)
            db.flush()
            synced += 1
        else:
            user.name = identity_user.full_name
            user.password_hash = identity_user.password_hash
            user.role_id = role.id
            user.outlet_id = outlet.id
            user.is_active = identity_user.is_active

        membership = (
            db.query(UserOutletRole)
            .filter(UserOutletRole.user_id == user.id, UserOutletRole.outlet_id == outlet.id)
            .first()
        )

        if not membership:
            db.add(
                UserOutletRole(
                    user_id=user.id,
                    organization_id=organization.id,
                    outlet_id=outlet.id,
                    role="admin",
                )
            )

    return synced


def main():
    db = SessionLocal()
    try:
        role = get_or_create_role(db)
        organization = get_or_create_organization(db)
        outlet = get_or_create_outlet(db, organization)
        synced = sync_users(db, role, outlet, organization)
        db.commit()
        print(f"Synced legacy task identity users: {synced}")
    finally:
        db.close()


if __name__ == "__main__":
    main()