from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import get_permissions_for_role
from app.repositories.outlet_repository import OutletRepository
from app.schemas.outlet import CurrentOutletResponse, OutletResponse

router = APIRouter(prefix="/outlets", tags=["Outlets"])


@router.get("/me", response_model=list[OutletResponse])
def get_my_outlets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    repo = OutletRepository(db)
    return repo.list_by_user(current_user.id)


@router.get("/current", response_model=CurrentOutletResponse)
def get_current_outlet(
    x_outlet_id: int = Header(..., alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    repo = OutletRepository(db)
    membership = repo.get_user_outlet_role(current_user.id, x_outlet_id)

    if not membership:
        raise HTTPException(status_code=403, detail="User has no access to this outlet")

    outlet = repo.get_outlet_by_id(x_outlet_id)
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    return {
        "outlet": outlet,
        "organization": outlet.organization,
        "role": membership.role,
        "permissions": get_permissions_for_role(membership.role),
    }
