from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import User as IdentityUser
from app.modules.lms.models import TrainingCompletion, TrainingModule
from app.modules.lms.schemas import (
    MyTrainingModuleRead,
    TrainingCompletionCreate,
    TrainingModuleCreate,
    TrainingModuleUpdate,
)


class LmsService:
    def __init__(self, db: Session):
        self.db = db

    def list_modules(self, *, active_only: bool = False) -> list[TrainingModule]:
        statement = select(TrainingModule).order_by(TrainingModule.created_at.desc())
        if active_only:
            statement = statement.where(TrainingModule.is_active.is_(True))
        return list(self.db.scalars(statement).all())

    def get_module(self, module_id: UUID) -> TrainingModule:
        module = self.db.get(TrainingModule, module_id)
        if not module:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training module not found")
        return module

    def create_module(self, payload: TrainingModuleCreate) -> TrainingModule:
        module = TrainingModule(**payload.model_dump())
        self.db.add(module)
        self.db.commit()
        self.db.refresh(module)
        return module

    def update_module(self, module_id: UUID, payload: TrainingModuleUpdate) -> TrainingModule:
        module = self.get_module(module_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(module, field, value)
        self.db.commit()
        self.db.refresh(module)
        return module

    def delete_module(self, module_id: UUID) -> None:
        module = self.get_module(module_id)
        self.db.delete(module)
        self.db.commit()

    def record_completion(self, user_id: UUID, payload: TrainingCompletionCreate) -> TrainingCompletion:
        module = self.get_module(payload.module_id)
        now = datetime.now(UTC)
        expires_at = None
        if module.expires_days:
            expires_at = now + timedelta(days=module.expires_days)

        completion = TrainingCompletion(
            user_id=user_id,
            module_id=module.id,
            completed_at=now,
            expires_at=expires_at,
        )
        self.db.add(completion)
        self.db.commit()
        self.db.refresh(completion)
        return completion

    def list_my_training(self, user: IdentityUser) -> list[MyTrainingModuleRead]:
        role_slug = user.role.slug if user.role else ""
        modules = self.list_modules(active_only=True)
        completions = self.db.scalars(
            select(TrainingCompletion).where(TrainingCompletion.user_id == user.id)
        ).all()
        completion_by_module = {item.module_id: item for item in completions}

        results: list[MyTrainingModuleRead] = []
        now = datetime.now(UTC)

        for module in modules:
            required_roles = module.required_for_roles or []
            required = not required_roles or role_slug in required_roles
            if not required:
                continue

            completion = completion_by_module.get(module.id)
            completed = False
            completed_at = None
            expires_at = None

            if completion:
                expired = completion.expires_at and completion.expires_at <= now
                completed = not expired
                completed_at = completion.completed_at
                expires_at = completion.expires_at

            results.append(
                MyTrainingModuleRead(
                    module=module,
                    completed=completed,
                    completed_at=completed_at,
                    expires_at=expires_at,
                    required=required,
                )
            )

        return results

    def has_incomplete_required_training(self, user: IdentityUser) -> bool:
        return any(not item.completed for item in self.list_my_training(user))

    def incomplete_required_module_titles(self, user: IdentityUser) -> list[str]:
        titles = [
            item.module.title
            for item in self.list_my_training(user)
            if item.required and not item.completed
        ]
        return list(dict.fromkeys(titles))
