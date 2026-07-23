from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.permissions import ADMIN_ROLE, OWNER_ROLE

from app.modules.workflows.models import (
    WorkflowApprovalHistory,
    WorkflowApprovalMatrix,
    WorkflowCondition,
    WorkflowDefinition,
    WorkflowEscalationRule,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowInstanceStep,
    WorkflowInstanceStepStatus,
    WorkflowStep,
    WorkflowTransition,
)


def workflow_load_options():
    return (
        selectinload(WorkflowDefinition.steps),
        selectinload(WorkflowDefinition.transitions),
    )


class WorkflowDefinitionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[WorkflowDefinition]:
        statement = (
            select(WorkflowDefinition)
            .options(*workflow_load_options())
            .order_by(WorkflowDefinition.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, workflow_id: UUID) -> WorkflowDefinition | None:
        statement = (
            select(WorkflowDefinition)
            .where(WorkflowDefinition.id == workflow_id)
            .options(*workflow_load_options())
        )
        return self.db.scalar(statement)

    def find_by_code(self, code: str) -> WorkflowDefinition | None:
        statement = (
            select(WorkflowDefinition)
            .where(WorkflowDefinition.code == code.strip().lower())
            .options(*workflow_load_options())
        )
        return self.db.scalar(statement)

    def create(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return self.find_by_id(workflow.id) or workflow

    def save(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return self.find_by_id(workflow.id) or workflow

    def delete(self, workflow: WorkflowDefinition) -> None:
        self.db.delete(workflow)
        self.db.commit()


class WorkflowStepRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, step: WorkflowStep) -> WorkflowStep:
        self.db.add(step)
        self.db.commit()
        self.db.refresh(step)
        return step


class WorkflowConditionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, condition: WorkflowCondition) -> WorkflowCondition:
        self.db.add(condition)
        self.db.commit()
        self.db.refresh(condition)
        return condition


class WorkflowTransitionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, transition: WorkflowTransition) -> WorkflowTransition:
        self.db.add(transition)
        self.db.commit()
        self.db.refresh(transition)
        return transition

class WorkflowApprovalMatrixRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_workflow(self, workflow_id: UUID) -> list[WorkflowApprovalMatrix]:
        statement = (
            select(WorkflowApprovalMatrix)
            .where(WorkflowApprovalMatrix.workflow_id == workflow_id)
            .order_by(WorkflowApprovalMatrix.sequence.asc(), WorkflowApprovalMatrix.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, matrix_id: UUID) -> WorkflowApprovalMatrix | None:
        statement = select(WorkflowApprovalMatrix).where(WorkflowApprovalMatrix.id == matrix_id)
        return self.db.scalar(statement)

    def create(self, matrix: WorkflowApprovalMatrix) -> WorkflowApprovalMatrix:
        self.db.add(matrix)
        self.db.commit()
        self.db.refresh(matrix)
        return matrix

    def save(self, matrix: WorkflowApprovalMatrix) -> WorkflowApprovalMatrix:
        self.db.add(matrix)
        self.db.commit()
        self.db.refresh(matrix)
        return matrix

    def delete(self, matrix: WorkflowApprovalMatrix) -> None:
        self.db.delete(matrix)
        self.db.commit()


class WorkflowInstanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[WorkflowInstance]:
        statement = (
            select(WorkflowInstance)
            .order_by(WorkflowInstance.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, instance_id: UUID) -> WorkflowInstance | None:
        statement = select(WorkflowInstance).where(WorkflowInstance.id == instance_id)
        return self.db.scalar(statement)

    def list_pending_for_user(
        self,
        *,
        user_id: UUID,
        role_id: UUID,
        outlet_ids: set[UUID],
        role_slug: str,
    ) -> list[WorkflowInstance]:
        instances = self.list()
        pending_statuses = {
            WorkflowInstanceStatus.pending_approval,
            WorkflowInstanceStatus.submitted,
        }

        if role_slug in {OWNER_ROLE, ADMIN_ROLE}:
            return [instance for instance in instances if instance.status in pending_statuses]

        step_repository = WorkflowInstanceStepRepository(self.db)
        matched: list[WorkflowInstance] = []

        for instance in instances:
            if instance.status not in pending_statuses:
                continue

            steps = step_repository.list_by_instance(instance.id)
            active_step = next(
                (step for step in steps if step.status == WorkflowInstanceStepStatus.active),
                None,
            )

            if not active_step:
                continue

            if active_step.assigned_to_user_id == user_id:
                matched.append(instance)
                continue

            if active_step.assigned_role_id == role_id:
                matched.append(instance)
                continue

            context_outlet_id = None
            if instance.context_json and instance.context_json.get("outlet_id"):
                try:
                    context_outlet_id = UUID(str(instance.context_json["outlet_id"]))
                except (TypeError, ValueError):
                    context_outlet_id = None

            if context_outlet_id and context_outlet_id in outlet_ids:
                matched.append(instance)

        return matched

    def create(self, instance: WorkflowInstance) -> WorkflowInstance:
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance


class WorkflowInstanceStepRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_instance(self, instance_id: UUID) -> list[WorkflowInstanceStep]:
        statement = (
            select(WorkflowInstanceStep)
            .where(WorkflowInstanceStep.instance_id == instance_id)
            .order_by(WorkflowInstanceStep.sequence.asc())
        )
        return list(self.db.scalars(statement).all())



    def list_overdue_active_steps(self, now: datetime) -> list[WorkflowInstanceStep]:
        statement = (
            select(WorkflowInstanceStep)
            .where(
                WorkflowInstanceStep.status == WorkflowInstanceStepStatus.active,
                WorkflowInstanceStep.due_at.is_not(None),
                WorkflowInstanceStep.due_at <= now,
            )
            .order_by(WorkflowInstanceStep.due_at.asc())
        )
        return list(self.db.scalars(statement).all())

class WorkflowApprovalHistoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_instance(self, instance_id: UUID) -> list[WorkflowApprovalHistory]:
        statement = (
            select(WorkflowApprovalHistory)
            .where(WorkflowApprovalHistory.instance_id == instance_id)
            .order_by(WorkflowApprovalHistory.created_at.asc())
        )
        return list(self.db.scalars(statement).all())

    def create(self, history: WorkflowApprovalHistory) -> WorkflowApprovalHistory:
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

class WorkflowEscalationRuleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_workflow(self, workflow_id: UUID) -> list[WorkflowEscalationRule]:
        statement = (
            select(WorkflowEscalationRule)
            .where(WorkflowEscalationRule.workflow_id == workflow_id)
            .order_by(
                WorkflowEscalationRule.trigger_after_hours.asc(),
                WorkflowEscalationRule.created_at.asc(),
            )
        )
        return list(self.db.scalars(statement).all())

    def find_by_id(self, rule_id: UUID) -> WorkflowEscalationRule | None:
        statement = select(WorkflowEscalationRule).where(
            WorkflowEscalationRule.id == rule_id
        )
        return self.db.scalar(statement)

    def create(self, rule: WorkflowEscalationRule) -> WorkflowEscalationRule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def save(self, rule: WorkflowEscalationRule) -> WorkflowEscalationRule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def delete(self, rule: WorkflowEscalationRule) -> None:
        self.db.delete(rule)
        self.db.commit()

    def list_active(self) -> list[WorkflowEscalationRule]:
        statement = (
            select(WorkflowEscalationRule)
            .where(WorkflowEscalationRule.is_active.is_(True))
            .order_by(
                WorkflowEscalationRule.workflow_id,
                WorkflowEscalationRule.trigger_after_hours,
            )
        )
        return list(self.db.scalars(statement).all())


