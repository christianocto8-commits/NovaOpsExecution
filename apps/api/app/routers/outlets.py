from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import get_permissions_for_role
from app.repositories.outlet_repository import OutletRepository
from app.schemas.outlet import CurrentOutletResponse, OutletLocationUpdate, OutletResponse, OutletUpdate

MANAGER_ADMIN_OUTLET_ROLES = {
    "Owner",
    "Administrator",
    "Frontline Manager",
    "Head Barista",
    "outlet_manager",
}

router = APIRouter(prefix="/outlets", tags=["Outlets"])


def ensure_outlet_manager_access(db: Session, user_id: int, outlet_id: int) -> None:
    repo = OutletRepository(db)
    membership = repo.get_user_outlet_role(user_id, outlet_id)

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this outlet",
        )

    if membership.role not in MANAGER_ADMIN_OUTLET_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only outlet managers or admins can update outlet location",
        )


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


@router.patch("/{outlet_id}/location", response_model=OutletResponse)
def update_outlet_location(
    outlet_id: int,
    payload: OutletLocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_manager_access(db, current_user.id, outlet_id)

    repo = OutletRepository(db)
    outlet = repo.update_location(
        outlet_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    if not outlet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outlet not found")

    return outlet


@router.patch("/{outlet_id}", response_model=OutletResponse)
def update_outlet(
    outlet_id: int,
    payload: OutletUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_outlet_manager_access(db, current_user.id, outlet_id)

    repo = OutletRepository(db)
    outlet = repo.update_outlet(
        outlet_id,
        region=payload.region,
        district=payload.district,
    )

    if not outlet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outlet not found")

    return outlet
