from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.identity.dependencies import get_current_user, require_role
from app.modules.identity.models import User as IdentityUser
from app.modules.lms.schemas import (
    MyTrainingModuleRead,
    TrainingCompletionCreate,
    TrainingCompletionRead,
    TrainingModuleCreate,
    TrainingModuleRead,
    TrainingModuleUpdate,
)
from app.modules.lms.service import LmsService

router = APIRouter(prefix="/lms", tags=["LMS"])


@router.get("/modules", response_model=list[TrainingModuleRead])
def list_training_modules(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return LmsService(db).list_modules()


@router.post("/modules", response_model=TrainingModuleRead, status_code=status.HTTP_201_CREATED)
def create_training_module(
    payload: TrainingModuleCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return LmsService(db).create_module(payload)


@router.put("/modules/{module_id}", response_model=TrainingModuleRead)
def update_training_module(
    module_id: UUID,
    payload: TrainingModuleUpdate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    return LmsService(db).update_module(module_id, payload)


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_training_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    LmsService(db).delete_module(module_id)
    return None


@router.post("/completions", response_model=TrainingCompletionRead, status_code=status.HTTP_201_CREATED)
def record_training_completion(
    payload: TrainingCompletionCreate,
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_user),
):
    return LmsService(db).record_completion(current_user.id, payload)


@router.get("/my-training", response_model=list[MyTrainingModuleRead])
def list_my_training(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(get_current_user),
):
    return LmsService(db).list_my_training(current_user)
