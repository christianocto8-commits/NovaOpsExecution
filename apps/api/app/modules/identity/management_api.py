from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import Outlet, User
from app.modules.identity.repository import (
    OrganizationRepository,
    OutletRepository,
    PermissionRepository,
    RoleRepository,
    UserRepository,
)
from app.modules.identity.schemas import (
    MessageResponse,
    OutletCreate,
    OutletRead,
    OutletUpdate,
    PermissionRead,
    RoleRead,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.modules.identity.security import hash_password

router = APIRouter(prefix="/identity", tags=["Identity"])


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read")),
):
    return RoleRepository(db).list()


@router.get("/permissions", response_model=list[PermissionRead])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read")),
):
    return PermissionRepository(db).list()


@router.get("/outlets", response_model=list[OutletRead])
def list_outlets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    return OutletRepository(db).list()


@router.post("/outlets", response_model=OutletRead, status_code=status.HTTP_201_CREATED)
def create_outlet(
    payload: OutletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.create")),
):
    outlets = OutletRepository(db)
    organization = OrganizationRepository(db).first()

    if not organization:
        raise HTTPException(status_code=400, detail="Organization is not configured")

    code = payload.code.strip().upper()

    if outlets.code_exists(code):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Outlet code already exists",
        )

    outlet = Outlet(
        organization_id=organization.id,
        code=code,
        name=payload.name.strip(),
        address=payload.address.strip() if payload.address else None,
        phone=payload.phone.strip() if payload.phone else None,
        status=payload.status.strip().lower(),
    )

    created = outlets.create(outlet)
    db.commit()
    return created


@router.patch("/outlets/{outlet_id}", response_model=OutletRead)
def update_outlet(
    outlet_id: UUID,
    payload: OutletUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.edit")),
):
    outlets = OutletRepository(db)

    outlet = outlets.find_by_id(outlet_id)
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "code" in update_data and update_data["code"]:
        code = str(update_data["code"]).strip().upper()

        if outlets.code_exists(code, exclude_outlet_id=outlet.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Outlet code already exists",
            )

        outlet.code = code

    if "name" in update_data and update_data["name"]:
        outlet.name = str(update_data["name"]).strip()

    if "address" in update_data:
        outlet.address = (
            str(update_data["address"]).strip() if update_data["address"] else None
        )

    if "phone" in update_data:
        outlet.phone = str(update_data["phone"]).strip() if update_data["phone"] else None

    if "status" in update_data and update_data["status"]:
        outlet.status = str(update_data["status"]).strip().lower()

    updated = outlets.update(outlet)
    db.commit()
    return updated


@router.delete("/outlets/{outlet_id}", response_model=MessageResponse)
def delete_outlet(
    outlet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.delete")),
):
    outlets = OutletRepository(db)

    outlet = outlets.find_by_id(outlet_id)
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    for linked_user in list(outlet.users):
        linked_user.outlet_id = None
        db.add(linked_user)

    db.delete(outlet)
    db.commit()

    return MessageResponse(message="Outlet deleted")


@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read")),
):
    return UserRepository(db).list()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.create")),
):
    users = UserRepository(db)
    roles = RoleRepository(db)
    outlets = OutletRepository(db)

    email = payload.email.strip().lower()
    username = payload.username.strip().lower()

    if users.email_or_username_exists(email=email, username=username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists",
        )

    role = roles.find_by_id(payload.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.outlet_id and not outlets.find_by_id(payload.outlet_id):
        raise HTTPException(status_code=404, detail="Outlet not found")

    user = User(
        email=email,
        username=username,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role_id=payload.role_id,
        outlet_id=payload.outlet_id,
        is_active=payload.is_active,
    )

    created = users.create(user)
    db.commit()
    return created


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.edit")),
):
    users = UserRepository(db)
    roles = RoleRepository(db)
    outlets = OutletRepository(db)

    user = users.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "email" in update_data or "username" in update_data:
        email = str(update_data.get("email", user.email)).strip().lower()
        username = str(update_data.get("username", user.username)).strip().lower()

        if users.email_or_username_exists(
            email=email,
            username=username,
            exclude_user_id=user.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email or username already exists",
            )

        user.email = email
        user.username = username

    if "full_name" in update_data:
        user.full_name = str(update_data["full_name"]).strip()

    if "password" in update_data:
        user.password_hash = hash_password(str(update_data["password"]))

    if "role_id" in update_data:
        role_id = update_data["role_id"]
        if not roles.find_by_id(role_id):
            raise HTTPException(status_code=404, detail="Role not found")
        user.role_id = role_id

    if "outlet_id" in update_data:
        outlet_id = update_data["outlet_id"]
        if outlet_id and not outlets.find_by_id(outlet_id):
            raise HTTPException(status_code=404, detail="Outlet not found")
        user.outlet_id = outlet_id

    if "is_active" in update_data:
        user.is_active = bool(update_data["is_active"])

    updated = users.update(user)
    db.commit()
    return updated


@router.delete("/users/{user_id}", response_model=MessageResponse)
def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.delete")),
):
    users = UserRepository(db)

    user = users.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    user.is_active = False
    users.update(user)
    db.commit()

    return MessageResponse(message="User deactivated")

