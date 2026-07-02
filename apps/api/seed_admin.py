from app.models import role, user, outlet
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User

db = SessionLocal()

role = db.query(Role).filter(Role.name == "Owner").first()

if not role:
    role = Role(name="Owner", description="System owner")
    db.add(role)
    db.commit()
    db.refresh(role)

admin = db.query(User).filter(User.email == "admin@novaops.com").first()

if not admin:
    admin = User(
        name="Admin NovaOps",
        email="admin@novaops.com",
        password_hash=get_password_hash("admin123"),
        role_id=role.id,
        outlet_id=None,
        is_active=True,
    )
    db.add(admin)
    db.commit()

db.close()

print("Admin user created successfully")