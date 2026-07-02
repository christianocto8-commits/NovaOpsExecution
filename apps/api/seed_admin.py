from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import Organization, Outlet, Role, User, UserOutletRole

ADMIN_EMAIL = "admin@novaops.com"
ADMIN_PASSWORD = "admin123"


def main() -> None:
    db = SessionLocal()
    try:
        role = db.query(Role).filter(Role.name == "Owner").first()
        if not role:
            role = Role(name="Owner", description="System owner")
            db.add(role)
            db.commit()
            db.refresh(role)

        organization = db.query(Organization).filter(Organization.slug == "novaops-enterprise").first()
        if not organization:
            organization = Organization(name="NovaOps Enterprise", slug="novaops-enterprise")
            db.add(organization)
            db.commit()
            db.refresh(organization)

        outlet = db.query(Outlet).filter(Outlet.code == "MAIN").first()
        if not outlet:
            outlet = Outlet(
                organization_id=organization.id,
                name="Main Outlet",
                code="MAIN",
                address="Primary Operating Outlet",
                is_active=True,
            )
            db.add(outlet)
            db.commit()
            db.refresh(outlet)
        elif outlet.organization_id is None:
            outlet.organization_id = organization.id
            db.commit()
            db.refresh(outlet)

        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not user:
            user = User(
                name="Admin NovaOps",
                email=ADMIN_EMAIL,
                password_hash=get_password_hash(ADMIN_PASSWORD),
                role_id=role.id,
                outlet_id=outlet.id,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.name = user.name or "Admin NovaOps"
            user.role_id = role.id
            user.outlet_id = outlet.id
            user.is_active = True
            db.commit()
            db.refresh(user)

        membership = (
            db.query(UserOutletRole)
            .filter(UserOutletRole.user_id == user.id)
            .filter(UserOutletRole.outlet_id == outlet.id)
            .first()
        )
        if not membership:
            membership = UserOutletRole(
                user_id=user.id,
                organization_id=organization.id,
                outlet_id=outlet.id,
                role="Owner",
            )
            db.add(membership)
            db.commit()
        else:
            membership.organization_id = organization.id
            membership.role = "Owner"
            db.commit()

        print("Admin seed completed.")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"Organization: {organization.name}")
        print(f"Outlet: {outlet.name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
