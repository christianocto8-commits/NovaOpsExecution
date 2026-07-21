from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.api_keys.schemas import ApiKeyCreate, ApiKeyCreated, ApiKeyRead
from app.modules.api_keys.service import ApiKeyService
from app.modules.identity.dependencies import require_role
from app.modules.identity.models import User as IdentityUser

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("", response_model=list[ApiKeyRead])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return ApiKeyService(db).list_keys()


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    service = ApiKeyService(db)
    api_key, raw_key = service.create_key(payload, current_user.id)
    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        scopes=list(api_key.scopes or []),
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        raw_key=raw_key,
    )


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    api_key_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    ApiKeyService(db).revoke_key(api_key_id)
    return None
