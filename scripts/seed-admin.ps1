$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\..\apps\api"
& "..\..\.venv\Scripts\Activate.ps1"

$script = @'
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User

db = SessionLocal()

email = "admin@novaops.com"
password = "admin123"

user = db.query(User).filter(User.email == email).first()

if user:
    user.password_hash = get_password_hash(password)
    user.is_active = True
    db.commit()
    print("Admin user already exists. Password reset to admin123.")
else:
    user = User(
        email=email,
        password_hash=get_password_hash(password),
        full_name="NovaOps Super Admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    print("Admin user created: admin@novaops.com / admin123")

db.close()
'@

$script | Set-Content ".novaops_seed_admin_tmp.py"
python ".novaops_seed_admin_tmp.py"
Remove-Item ".novaops_seed_admin_tmp.py" -Force
