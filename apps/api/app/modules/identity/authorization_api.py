from fastapi import APIRouter, Depends

from app.modules.identity.dependencies import AuthContext, get_auth_context
from app.modules.identity.schemas import AuthContextResponse

router = APIRouter(prefix="/authorization", tags=["Identity"])


@router.get("/context", response_model=AuthContextResponse)
def authorization_context(
    auth_context: AuthContext = Depends(get_auth_context),
) -> AuthContextResponse:
    return AuthContextResponse(
        user_id=auth_context.user.id,
        username=auth_context.user.username,
        email=auth_context.user.email,
        role=auth_context.role,
        outlet_id=auth_context.outlet_id,
        permissions=sorted(auth_context.permissions),
        token_version=auth_context.token_version,
    )
