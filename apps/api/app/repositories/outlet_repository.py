from sqlalchemy.orm import Session, joinedload

from app.models.outlet import Outlet
from app.models.user_outlet_role import UserOutletRole


class OutletRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_user(self, user_id: int) -> list[Outlet]:
        return (
            self.db.query(Outlet)
            .join(UserOutletRole, UserOutletRole.outlet_id == Outlet.id)
            .filter(UserOutletRole.user_id == user_id)
            .filter(Outlet.is_active.is_(True))
            .options(joinedload(Outlet.organization))
            .order_by(Outlet.name.asc())
            .all()
        )

    def get_user_outlet_role(self, user_id: int, outlet_id: int) -> UserOutletRole | None:
        return (
            self.db.query(UserOutletRole)
            .filter(UserOutletRole.user_id == user_id)
            .filter(UserOutletRole.outlet_id == outlet_id)
            .first()
        )

    def get_outlet_by_id(self, outlet_id: int) -> Outlet | None:
        return (
            self.db.query(Outlet)
            .options(joinedload(Outlet.organization))
            .filter(Outlet.id == outlet_id)
            .first()
        )

    def update_location(
        self,
        outlet_id: int,
        *,
        latitude: float,
        longitude: float,
    ) -> Outlet | None:
        outlet = self.get_outlet_by_id(outlet_id)
        if not outlet:
            return None

        outlet.latitude = latitude
        outlet.longitude = longitude
        self.db.add(outlet)
        self.db.commit()
        self.db.refresh(outlet)
        return outlet
