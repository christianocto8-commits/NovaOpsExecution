from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.identity.models import Organization, Outlet, Permission, Role, User
from app.modules.identity.permissions import ROLE_PERMISSION_MAP, SYSTEM_ROLES
from app.modules.identity.security import hash_password


DEFAULT_ADMIN_EMAIL = "admin@novaops.local"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "Admin12345!"


ROLE_NAMES = {
    "owner": "Owner",
    "admin": "Admin",
    "area_manager": "Area Manager",
    "outlet": "Outlet",
}


def get_or_create_permission(db: Session, code: str) -> Permission:
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


def get_or_create_role(db: Session, slug: str) -> Role:
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


def main() -> None:
    db = SessionLocal()

    try:
        roles: dict[str, Role] = {}

        for slug in SYSTEM_ROLES:
            role = get_or_create_role(db, slug)
            role.permissions = [
                get_or_create_permission(db, code)
                for code in ROLE_PERMISSION_MAP.get(slug, [])
            ]
            roles[slug] = role

        organization = db.scalar(
            select(Organization).where(Organization.code == "KOV")
        )

        if not organization:
            organization = Organization(
                code="KOV",
                name="KOV Koffie",
                timezone="Asia/Jakarta",
                currency="IDR",
            )
            db.add(organization)
            db.flush()

        outlets = [
            ("MONTRE", "KOV Montre"),
            ("HERITAGE", "KOV Heritage"),
            ("SULTAN", "KOV Sultan Agung"),
            ("SULA", "KOV Sula"),
        ]

        for code, name in outlets:
            outlet = db.scalar(select(Outlet).where(Outlet.code == code))
            if not outlet:
                db.add(
                    Outlet(
                        organization_id=organization.id,
                        code=code,
                        name=name,
                        status="active",
                    )
                )

        user = db.scalar(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))

        if not user:
            db.add(
                User(
                    email=DEFAULT_ADMIN_EMAIL,
                    username=DEFAULT_ADMIN_USERNAME,
                    password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                    full_name="NovaOps Admin",
                    role_id=roles["owner"].id,
                    outlet_id=None,
                    is_active=True,
                )
            )

        db.commit()

        print("Identity seed completed.")
        print(f"Admin email    : {DEFAULT_ADMIN_EMAIL}")
        print(f"Admin username : {DEFAULT_ADMIN_USERNAME}")
        print(f"Admin password : {DEFAULT_ADMIN_PASSWORD}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
