from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.food_prep.models import FoodPrepLabel
from app.modules.food_prep.schemas import (
    FoodPrepLabelCreate,
    FoodPrepLabelSummary,
    FoodPrepLabelUpdate,
)
from app.modules.incidents.service import accessible_outlet_ids


def _ensure_outlet_access(db: Session, user, outlet_id: UUID) -> None:
    allowed = accessible_outlet_ids(db, user)
    if allowed is not None and outlet_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Outlet is outside your scope",
        )


def _status_for(label: FoodPrepLabel, now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    if label.discarded_at:
        return "discarded"
    if label.discard_at < now:
        return "expired"
    if label.discard_at - now <= timedelta(hours=2):
        return "expiring_soon"
    return "active"


class FoodPrepLabelService:
    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        user,
        *,
        outlet_id: UUID | None = None,
        status_filter: str | None = None,
        limit: int = 200,
    ) -> list[FoodPrepLabel]:
        statement = select(FoodPrepLabel)
        allowed = accessible_outlet_ids(self.db, user)
        if allowed is not None:
            if not allowed:
                return []
            statement = statement.where(FoodPrepLabel.outlet_id.in_(allowed))
        if outlet_id:
            _ensure_outlet_access(self.db, user, outlet_id)
            statement = statement.where(FoodPrepLabel.outlet_id == outlet_id)

        labels = list(
            self.db.scalars(
                statement.order_by(FoodPrepLabel.created_at.desc()).limit(min(max(limit, 1), 500))
            ).all()
        )

        if status_filter:
            labels = [label for label in labels if _status_for(label) == status_filter]

        return labels

    def get(self, user, label_id: UUID) -> FoodPrepLabel:
        label = self.db.get(FoodPrepLabel, label_id)
        if not label:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food prep label not found")
        _ensure_outlet_access(self.db, user, label.outlet_id)
        return label

    def create(self, user, payload: FoodPrepLabelCreate) -> FoodPrepLabel:
        _ensure_outlet_access(self.db, user, payload.outlet_id)
        label = FoodPrepLabel(
            **payload.model_dump(),
            created_by=user.id,
        )
        self.db.add(label)
        self.db.commit()
        self.db.refresh(label)
        return label

    def update(self, user, label_id: UUID, payload: FoodPrepLabelUpdate) -> FoodPrepLabel:
        label = self.get(user, label_id)
        values = payload.model_dump(exclude_unset=True)
        for key, value in values.items():
            setattr(label, key, value)
        self.db.add(label)
        self.db.commit()
        self.db.refresh(label)
        return label

    def mark_discarded(self, user, label_id: UUID) -> FoodPrepLabel:
        label = self.get(user, label_id)
        label.discarded_at = datetime.now(UTC)
        self.db.add(label)
        self.db.commit()
        self.db.refresh(label)
        return label

    def delete(self, user, label_id: UUID) -> None:
        label = self.get(user, label_id)
        self.db.delete(label)
        self.db.commit()

    def summary(self, user) -> FoodPrepLabelSummary:
        labels = self.list(user)
        now = datetime.now(UTC)
        return FoodPrepLabelSummary(
            total=len(labels),
            active=sum(1 for label in labels if _status_for(label, now) == "active"),
            expired=sum(1 for label in labels if _status_for(label, now) == "expired"),
            discarded=sum(1 for label in labels if _status_for(label, now) == "discarded"),
            expiring_soon=sum(1 for label in labels if _status_for(label, now) == "expiring_soon"),
        )

    def counts_by_outlet(self, user) -> list[dict]:
        allowed = accessible_outlet_ids(self.db, user)
        statement = select(FoodPrepLabel.outlet_id, func.count(FoodPrepLabel.id)).group_by(
            FoodPrepLabel.outlet_id
        )
        if allowed is not None:
            if not allowed:
                return []
            statement = statement.where(FoodPrepLabel.outlet_id.in_(allowed))
        rows = self.db.execute(statement).all()
        now = datetime.now(UTC)
        result = []
        for outlet_id, total in rows:
            labels = [
                label
                for label in self.db.scalars(
                    select(FoodPrepLabel).where(FoodPrepLabel.outlet_id == outlet_id)
                ).all()
            ]
            result.append(
                {
                    "outlet_id": str(outlet_id),
                    "total": total,
                    "active": sum(1 for label in labels if _status_for(label, now) == "active"),
                    "expired": sum(1 for label in labels if _status_for(label, now) == "expired"),
                }
            )
        return result
