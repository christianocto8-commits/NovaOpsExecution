from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import AuthContext, get_auth_context
from app.modules.identity.schemas import (
    AuthContextOutletAccessResponse,
    AuthContextResponse,
    AuthContextRoleResponse,
    AuthContextUserResponse,
    OutletRead,
)
from app.modules.tasks.identity_bridge import (
    get_or_create_legacy_outlet,
    sync_identity_access,
)

router = APIRouter(prefix="/authorization", tags=["Identity"])


def _legacy_ids_for_outlets(db: Session, auth_context: AuthContext) -> tuple[int | None, list[int]]:
    identity_user = auth_context.user
    legacy_user, legacy_outlet_ids, full_access = sync_identity_access(db, identity_user)
    del legacy_user, full_access

    primary = legacy_outlet_ids[0] if legacy_outlet_ids else None
    return primary, legacy_outlet_ids


def resolve_outlet_access(db: Session, auth_context: AuthContext) -> AuthContextOutletAccessResponse:
    user = auth_context.user
    role_slug = user.role.slug
    legacy_outlet_id, legacy_outlet_ids = _legacy_ids_for_outlets(db, auth_context)

    if role_slug in {"owner", "admin"}:
        return AuthContextOutletAccessResponse(
            scope="all",
            outlet_id=None,
            outlet_ids=[],
            legacy_outlet_id=None,
            legacy_outlet_ids=legacy_outlet_ids,
            outlets=[],
        )

    if role_slug == "area_manager":
        return AuthContextOutletAccessResponse(
            scope="multiple",
            outlet_id=None,
            outlet_ids=[outlet.id for outlet in user.assigned_outlets],
            legacy_outlet_id=legacy_outlet_id,
            legacy_outlet_ids=legacy_outlet_ids,
            outlets=[OutletRead.model_validate(outlet) for outlet in user.assigned_outlets],
        )

    legacy_for_user = legacy_outlet_id
    if user.outlet_id and legacy_for_user is None:
        identity_outlet = user.outlet
        if identity_outlet:
            legacy_for_user = get_or_create_legacy_outlet(db, identity_outlet).id

    return AuthContextOutletAccessResponse(
        scope="single",
        outlet_id=user.outlet_id,
        outlet_ids=[user.outlet_id] if user.outlet_id else [],
        outlet_name=user.outlet.name if user.outlet else None,
        outlet_code=user.outlet.code if user.outlet else None,
        legacy_outlet_id=legacy_for_user,
        legacy_outlet_ids=legacy_outlet_ids,
        outlets=[OutletRead.model_validate(user.outlet)] if user.outlet else [],
    )


@router.get("/context", response_model=AuthContextResponse)
def authorization_context(
    auth_context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> AuthContextResponse:
    user = auth_context.user
    outlet_access = resolve_outlet_access(db, auth_context)
    db.commit()

    return AuthContextResponse(
        user=AuthContextUserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
        ),
        role=AuthContextRoleResponse(
            id=user.role.id,
            name=user.role.name,
            slug=user.role.slug,
        ),
        outlet_access=outlet_access,
        permissions=sorted(auth_context.permissions),
        token_version=auth_context.token_version,
    )
