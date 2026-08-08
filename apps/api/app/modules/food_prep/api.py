from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.food_prep.schemas import (
    FoodPrepLabelCreate,
    FoodPrepLabelRead,
    FoodPrepLabelSummary,
    FoodPrepLabelUpdate,
)
from app.modules.food_prep.service import FoodPrepLabelService, _status_for
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User

router = APIRouter(prefix="/food-prep", tags=["Food Prep"])


def _to_read(label) -> FoodPrepLabelRead:
    data = FoodPrepLabelRead.model_validate(label)
    data.status = _status_for(label)
    return data


@router.get("/labels", response_model=list[FoodPrepLabelRead])
def list_labels(
    outlet_id: UUID | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return [
        _to_read(label)
        for label in FoodPrepLabelService(db).list(
            user,
            outlet_id=outlet_id,
            status_filter=status_filter,
            limit=limit,
        )
    ]


@router.get("/labels/summary", response_model=FoodPrepLabelSummary)
def label_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return FoodPrepLabelService(db).summary(user)


@router.get("/labels/by-outlet", response_model=list[dict])
def labels_by_outlet(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("report.read")),
):
    return FoodPrepLabelService(db).counts_by_outlet(user)


@router.post(
    "/labels",
    response_model=FoodPrepLabelRead,
    status_code=status.HTTP_201_CREATED,
)
def create_label(
    payload: FoodPrepLabelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    return _to_read(FoodPrepLabelService(db).create(user, payload))


@router.patch("/labels/{label_id}", response_model=FoodPrepLabelRead)
def update_label(
    label_id: UUID,
    payload: FoodPrepLabelUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    return _to_read(FoodPrepLabelService(db).update(user, label_id, payload))


@router.post("/labels/{label_id}/discard", response_model=FoodPrepLabelRead)
def discard_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    return _to_read(FoodPrepLabelService(db).mark_discarded(user, label_id))


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("task.execute")),
):
    FoodPrepLabelService(db).delete(user, label_id)
