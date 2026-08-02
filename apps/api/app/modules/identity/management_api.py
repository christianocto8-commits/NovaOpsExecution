from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete, select, update as sa_update
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_active_user, require_permission
from app.modules.identity.models import (
    AuditLog,
    District,
    Outlet,
    OutletOperator,
    Permission,
    RefreshToken,
    Region,
    Role,
    User,
)
from app.modules.tasks.identity_bridge import get_accessible_identity_outlets
from app.modules.identity.permissions import (
    ROLE_DISPLAY_NAMES,
    ROLE_PERMISSION_MAP,
    SYSTEM_ROLES,
)
from app.modules.identity.repository import (
    OrganizationRepository,
    LoginOtpChallengeRepository,
    OutletRepository,
    OutletOperatorRepository,
    PermissionRepository,
    RoleRepository,
    UserRepository,
)
from app.modules.identity.schemas import (
    MessageResponse,
    DistrictRead,
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
    RolePermissionsUpdate,
    UserCreate,
    UserRead,
    UserUpdate,
    RegionRead,
)
from app.modules.identity.security import hash_password, verify_password
from app.modules.identity.service import validate_password_policy

router = APIRouter(prefix="/identity", tags=["Identity"])


def resolve_user_outlet_access(
    *,
    role_slug: str,
    outlet_id: UUID | None,
    outlet_ids: list[UUID] | None,
    outlets: OutletRepository,
) -> tuple[UUID | None, list[Outlet]]:
    if role_slug in {"owner", "admin", "finance_head_office"}:
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

    if role_slug in {
        "regional_manager",
        "district_manager",
        "area_manager",
        "finance",
    }:
        selected_ids = outlet_ids or []

        if not selected_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Finance Outlet must manage at least one outlet"
                    if role_slug == "finance"
                    else f"{role_slug.replace('_', ' ').title()} must manage at least one outlet"
                ),
            )

        selected_outlets: list[Outlet] = []

        for selected_id in selected_ids:
            outlet = outlets.find_by_id(selected_id)
            if not outlet:
                raise HTTPException(status_code=404, detail="Outlet not found")
            selected_outlets.append(outlet)

        return None, selected_outlets

    return None, []


def ensure_system_roles_and_permissions(db: Session) -> list[Role]:
    permissions_by_code = {permission.code: permission for permission in PermissionRepository(db).list()}
    for code in sorted({code for codes in ROLE_PERMISSION_MAP.values() for code in codes}):
        if code not in permissions_by_code:
            permission = Permission(
                code=code,
                name=code.replace(".", " ").title(),
                description=f"Allows {code}",
            )
            db.add(permission)
            db.flush()
            permissions_by_code[code] = permission

    synced_roles: list[Role] = []
    for slug in SYSTEM_ROLES:
        role = RoleRepository(db).find_by_slug(slug)
        desired_name = ROLE_DISPLAY_NAMES.get(slug, slug.replace("_", " ").title())
        if role is None:
            role = Role(
                slug=slug,
                name=desired_name,
                description=f"System role: {slug}",
            )
            db.add(role)
            db.flush()
        elif role.name != desired_name:
            role.name = desired_name
        role.permissions = [
            permissions_by_code[code]
            for code in ROLE_PERMISSION_MAP.get(slug, [])
            if code in permissions_by_code
        ]
        db.add(role)
        synced_roles.append(role)

    db.commit()
    return list(
        db.scalars(
            select(Role).where(Role.slug.in_(SYSTEM_ROLES)).order_by(Role.slug.asc())
        ).all()
    )


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read")),
):
    return RoleRepository(db).list()


@router.post("/roles/sync-system", response_model=list[RoleRead])
def sync_system_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.edit")),
):
    del current_user
    return ensure_system_roles_and_permissions(db)


@router.get("/permissions", response_model=list[PermissionRead])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read")),
):
    return PermissionRepository(db).list()


@router.patch("/roles/{role_id}/permissions", response_model=RoleRead)
def update_role_permissions(
    role_id: UUID,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.edit")),
):
    role = RoleRepository(db).find_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    requested_codes = sorted({code.strip() for code in payload.permission_codes if code.strip()})

    if role.slug in {"owner", "admin"} and "user.edit" not in requested_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner/admin role must keep user.edit permission",
        )

    permissions = PermissionRepository(db).list_by_codes(requested_codes)
    found_codes = {permission.code for permission in permissions}
    missing_codes = sorted(set(requested_codes) - found_codes)

    if missing_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permission code: {', '.join(missing_codes)}",
        )

    role.permissions = permissions
    db.add(role)
    db.commit()
    db.refresh(role)

    return role


@router.get("/outlets", response_model=list[OutletRead])
def list_outlets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    accessible_outlets, full_access = get_accessible_identity_outlets(db, current_user)
    if full_access:
        return OutletRepository(db).list()
    return sorted(accessible_outlets, key=lambda outlet: outlet.name.lower())


@router.get("/regions", response_model=list[RegionRead])
def list_regions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    return db.scalars(select(Region).order_by(Region.name.asc())).all()


@router.get("/districts", response_model=list[DistrictRead])
def list_districts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("outlet.read")),
):
    return db.scalars(select(District).order_by(District.name.asc())).all()


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

    if "operating_hours_open" in update_data:
        outlet.operating_hours_open = update_data["operating_hours_open"]

    if "operating_hours_close" in update_data:
        outlet.operating_hours_close = update_data["operating_hours_close"]

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
    users = UserRepository(db).list()
    accessible_outlets, full_access = get_accessible_identity_outlets(db, current_user)
    if full_access:
        return users

    accessible_ids = {outlet.id for outlet in accessible_outlets}
    scoped: list[User] = []
    for user in users:
        if user.outlet_id and user.outlet_id in accessible_ids:
            scoped.append(user)
            continue
        if any(outlet.id in accessible_ids for outlet in user.assigned_outlets):
            scoped.append(user)
    return scoped


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.create")),
):
    users = UserRepository(db)
    roles = RoleRepository(db)
    outlets = OutletRepository(db)
    validate_password_policy(payload.password)

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
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        role_id=payload.role_id,
        outlet_id=resolved_outlet_id,
        region_id=payload.region_id,
        district_id=payload.district_id,
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

    if "phone_number" in update_data:
        raw_phone = update_data["phone_number"]
        user.phone_number = str(raw_phone).strip() if raw_phone else None

    if "password" in update_data:
        validate_password_policy(str(update_data["password"]))
        user.password_hash = hash_password(str(update_data["password"]))
        user.password_changed_at = datetime.now(UTC)
        RefreshTokenRepository(db).revoke_all_for_user(user.id)

    next_role_id = update_data.get("role_id", user.role_id)
    next_role = roles.find_by_id(next_role_id)

    if not next_role:
        raise HTTPException(status_code=404, detail="Role not found")

    should_resolve_access = (
        "role_id" in update_data
        or "outlet_id" in update_data
        or "outlet_ids" in update_data
        or "region_id" in update_data
        or "district_id" in update_data
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
        user.region_id = update_data.get("region_id", user.region_id)
        user.district_id = update_data.get("district_id", user.district_id)
        RefreshTokenRepository(db).revoke_all_for_user(user.id)

    if "is_active" in update_data:
        user.is_active = bool(update_data["is_active"])
        if not user.is_active:
            RefreshTokenRepository(db).revoke_all_for_user(user.id)

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


@router.post("/users/{user_id}/security-reset", response_model=MessageResponse)
def reset_user_security(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.edit")),
):
    users = UserRepository(db)
    user = users.find_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    revoked_sessions = RefreshTokenRepository(db).revoke_all_for_user(user.id)
    cleared_challenges = LoginOtpChallengeRepository(db).consume_active_for_user(user.id)

    record_identity_audit_event(
        db,
        action="user_security_reset",
        resource_type="identity_user",
        actor_user_id=current_user.id,
        organization_id=current_user.outlet.organization_id if current_user.outlet else None,
        outlet_id=current_user.outlet_id,
        resource_id=str(user.id),
        metadata={
            "user_email": user.email,
            "revoked_sessions": revoked_sessions,
            "cleared_otp_challenges": cleared_challenges,
        },
    )
    db.commit()

    return MessageResponse(
        message=(
            f"Security reset complete. Revoked {revoked_sessions} device(s) "
            f"and cleared {cleared_challenges} OTP challenge(s)."
        )
    )


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

    validate_password_policy(payload.new_password)
    current_user.password_hash = hash_password(payload.new_password)
    current_user.password_changed_at = datetime.now(UTC)
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
