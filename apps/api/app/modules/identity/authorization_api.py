from fastapi import APIRouter, Depends

from app.modules.identity.dependencies import AuthContext, get_auth_context
from app.modules.identity.schemas import (
    AuthContextOutletAccessResponse,
    AuthContextResponse,
    AuthContextRoleResponse,
    AuthContextUserResponse,
)

router = APIRouter(prefix="/authorization", tags=["Identity"])


def resolve_outlet_access(auth_context: AuthContext) -> AuthContextOutletAccessResponse:
    user = auth_context.user
    role_slug = user.role.slug

    if role_slug in {"owner", "admin"}:
        return AuthContextOutletAccessResponse(
            scope="all",
            outlet_id=None,
            outlet_ids=[],
        )

    if role_slug == "area_manager":
        return AuthContextOutletAccessResponse(
            scope="multiple",
            outlet_id=None,
            outlet_ids=[outlet.id for outlet in user.assigned_outlets],
        )

    return AuthContextOutletAccessResponse(
        scope="single",
        outlet_id=user.outlet_id,
        outlet_ids=[user.outlet_id] if user.outlet_id else [],
    )


@router.get("/context", response_model=AuthContextResponse)
def authorization_context(
    auth_context: AuthContext = Depends(get_auth_context),
) -> AuthContextResponse:
    user = auth_context.user

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
        outlet_access=resolve_outlet_access(auth_context),
        permissions=sorted(auth_context.permissions),
        token_version=auth_context.token_version,
    )
