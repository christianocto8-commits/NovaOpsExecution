from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete, update as sa_update
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_active_user, require_permission
from app.modules.identity.models import AuditLog, Outlet, OutletOperator, RefreshToken, User
from app.modules.identity.repository import (
    OrganizationRepository,
    OutletRepository,
    OutletOperatorRepository,
    PermissionRepository,
    RoleRepository,
    UserRepository,
)
from app.modules.identity.schemas import (
    MessageResponse,
    OutletCreate,
    OutletRead,
    OutletUpdate,
    OutletOperatorCreate,
    OutletMetricsRead,
    OutletOperatorRead,
    OutletOperatorUpdate,
    PasswordChangeRequest,
    PermissionRead,
    RoleRead,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.modules.identity.security import hash_password, verify_password

router = APIRouter(prefix="/identity", tags=["Identity"])


def resolve_user_outlet_access(
    *,
    role_slug: str,
    outlet_id: UUID | None,
    outlet_ids: list[UUID] | None,
    outlets: OutletRepository,
) -> tuple[UUID | None, list[Outlet]]:
    if role_slug in {"owner", "admin"}:
        return None, []

    if role_slug == "outlet":
        if not outlet_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Outlet account must be assigned to one outlet",
            )

        outlet = outlets.find_by_id(outlet_id)
        if not outlet:
            raise HTTPException(status_code=404, detail="Outlet not found")

        return outlet.id, []

    if role_slug == "area_manager":
        selected_ids = outlet_ids or []

        if not selected_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Area manager must manage at least one outlet",
            )

        selected_outlets: list[Outlet] = []

        for selected_id in selected_ids:
            outlet = outlets.find_by_id(selected_id)
            if not outlet:
                raise HTTPException(status_code=404, detail="Outlet not found")
            selected_outlets.append(outlet)

        return None, selected_outlets

    return None, []


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

    resolved_outlet_id, assigned_outlets = resolve_user_outlet_access(
        role_slug=role.slug,
        outlet_id=payload.outlet_id,
        outlet_ids=payload.outlet_ids,
        outlets=outlets,
    )

    user = User(
        email=email,
        username=username,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role_id=payload.role_id,
        outlet_id=resolved_outlet_id,
        is_active=payload.is_active,
    )

    user.assigned_outlets = assigned_outlets

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

    next_role_id = update_data.get("role_id", user.role_id)
    next_role = roles.find_by_id(next_role_id)

    if not next_role:
        raise HTTPException(status_code=404, detail="Role not found")

    should_resolve_access = (
        "role_id" in update_data
        or "outlet_id" in update_data
        or "outlet_ids" in update_data
    )

    if should_resolve_access:
        resolved_outlet_id, assigned_outlets = resolve_user_outlet_access(
            role_slug=next_role.slug,
            outlet_id=update_data.get("outlet_id", user.outlet_id),
            outlet_ids=update_data.get(
                "outlet_ids",
                [outlet.id for outlet in user.assigned_outlets],
            ),
            outlets=outlets,
        )

        user.role_id = next_role.id
        user.outlet_id = resolved_outlet_id
        user.assigned_outlets = assigned_outlets

    if "is_active" in update_data:
        user.is_active = bool(update_data["is_active"])

    updated = users.update(user)
    db.commit()
    return updated


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
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
            detail="You cannot delete your own account",
        )

    user.assigned_outlets.clear()
    db.execute(sa_delete(RefreshToken).where(RefreshToken.user_id == user.id))
    db.execute(
        sa_update(AuditLog)
        .where(AuditLog.actor_user_id == user.id)
        .values(actor_user_id=None)
    )
    db.delete(user)
    db.commit()

    return MessageResponse(message="User deleted")


@router.patch("/me/password", response_model=MessageResponse)
def change_own_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()

    return MessageResponse(message="Password updated")





@router.get("/operators", response_model=list[OutletOperatorRead])
def list_operators(
    outlet_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    operators = OutletOperatorRepository(db)

    if outlet_id:
        return operators.list_by_outlet(outlet_id)

    return operators.list()


@router.post("/operators", response_model=OutletOperatorRead, status_code=status.HTTP_201_CREATED)
def create_operator(
    payload: OutletOperatorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.edit")),
):
    outlets = OutletRepository(db)

    outlet = outlets.find_by_id(payload.outlet_id)
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    operator = OutletOperator(
        outlet_id=payload.outlet_id,
        name=payload.name.strip(),
        position=payload.position.strip(),
        pin=payload.pin.strip(),
        is_active=payload.is_active,
    )

    created = OutletOperatorRepository(db).create(operator)
    db.commit()
    return created


@router.patch("/operators/{operator_id}", response_model=OutletOperatorRead)
def update_operator(
    operator_id: UUID,
    payload: OutletOperatorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.edit")),
):
    operators = OutletOperatorRepository(db)
    outlets = OutletRepository(db)

    operator = operators.find_by_id(operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "outlet_id" in update_data and update_data["outlet_id"]:
        outlet = outlets.find_by_id(update_data["outlet_id"])
        if not outlet:
            raise HTTPException(status_code=404, detail="Outlet not found")
        operator.outlet_id = update_data["outlet_id"]

    if "name" in update_data and update_data["name"]:
        operator.name = str(update_data["name"]).strip()

    if "position" in update_data and update_data["position"]:
        operator.position = str(update_data["position"]).strip()

    if "pin" in update_data and update_data["pin"]:
        operator.pin = str(update_data["pin"]).strip()

    if "is_active" in update_data:
        operator.is_active = bool(update_data["is_active"])

    updated = operators.update(operator)
    db.commit()
    return updated


@router.delete("/operators/{operator_id}", response_model=MessageResponse)
def delete_operator(
    operator_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.edit")),
):
    operators = OutletOperatorRepository(db)

    operator = operators.find_by_id(operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    db.delete(operator)
    db.commit()

    return MessageResponse(message="Operator deleted")

@router.get("/outlets/metrics", response_model=list[OutletMetricsRead])
def list_outlet_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    outlets = OutletRepository(db).list()
    operators = OutletOperatorRepository(db).list()

    active_operator_count_by_outlet: dict[UUID, int] = {}

    for operator in operators:
        if not operator.is_active:
            continue

        active_operator_count_by_outlet[operator.outlet_id] = (
            active_operator_count_by_outlet.get(operator.outlet_id, 0) + 1
        )

    return [
        OutletMetricsRead(
            outlet_id=outlet.id,
            open_tasks=0,
            completed_today=0,
            compliance=0,
            last_audit=None,
            active_operators=active_operator_count_by_outlet.get(outlet.id, 0),
        )
        for outlet in outlets
    ]
