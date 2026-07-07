from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.notifications.models import NotificationChannel

from app.modules.workflows.models import WorkflowActionType, WorkflowApprovalHistory, WorkflowApprovalMatrix, WorkflowDefinition, WorkflowEscalationRule, WorkflowInstance, WorkflowInstanceStatus, WorkflowInstanceStep, WorkflowInstanceStepStatus, WorkflowStep
from app.modules.workflows.repository import WorkflowApprovalHistoryRepository, WorkflowApprovalMatrixRepository, WorkflowDefinitionRepository, WorkflowEscalationRuleRepository, WorkflowInstanceRepository, WorkflowInstanceStepRepository
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.modules.workflows.schemas import WorkflowActionRequest, WorkflowApprovalMatrixCreate, WorkflowApprovalMatrixUpdate, WorkflowDefinitionCreate, WorkflowDefinitionUpdate, WorkflowEscalationRuleCreate, WorkflowEscalationRuleUpdate, WorkflowInstanceCreate


class WorkflowDefinitionService:
    def __init__(self, db: Session):
        self.repository = WorkflowDefinitionRepository(db)

    def list_workflows(self) -> list[WorkflowDefinition]:
        return self.repository.list()

    def get_workflow(self, workflow_id: UUID) -> WorkflowDefinition:
        workflow = self.repository.find_by_id(workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        return workflow

    def create_workflow(self, payload: WorkflowDefinitionCreate) -> WorkflowDefinition:
        code = payload.code.strip().lower()

        if self.repository.find_by_code(code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workflow code already exists",
            )

        workflow = WorkflowDefinition(
            code=code,
            name=payload.name.strip(),
            description=payload.description,
            module=payload.module.strip().lower(),
            metadata_json=payload.metadata_json,
        )

        for step_payload in payload.steps:
            workflow.steps.append(
                WorkflowStep(
                    code=step_payload.code.strip().lower(),
                    name=step_payload.name.strip(),
                    step_type=step_payload.step_type,
                    position=step_payload.position,
                    config_json=step_payload.config_json,
                )
            )

        return self.repository.create(workflow)

    def update_workflow(
        self,
        workflow_id: UUID,
        payload: WorkflowDefinitionUpdate,
    ) -> WorkflowDefinition:
        workflow = self.get_workflow(workflow_id)

        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field in {"name", "module"} and isinstance(value, str):
                value = value.strip()

            if field == "module" and isinstance(value, str):
                value = value.lower()

            setattr(workflow, field, value)

        return self.repository.save(workflow)

    def delete_workflow(self, workflow_id: UUID) -> None:
        workflow = self.get_workflow(workflow_id)
        self.repository.delete(workflow)

class WorkflowApprovalMatrixService:
    def __init__(self, db: Session):
        self.db = db
        self.workflow_repository = WorkflowDefinitionRepository(db)
        self.repository = WorkflowApprovalMatrixRepository(db)

    def list_by_workflow(self, workflow_id: UUID) -> list[WorkflowApprovalMatrix]:
        workflow = self.workflow_repository.find_by_id(workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        return self.repository.list_by_workflow(workflow_id)

    def create_matrix(self, payload: WorkflowApprovalMatrixCreate) -> WorkflowApprovalMatrix:
        workflow = self.workflow_repository.find_by_id(payload.workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        step_ids = {step.id for step in workflow.steps}

        if payload.step_id not in step_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approval step does not belong to workflow",
            )

        matrix = WorkflowApprovalMatrix(**payload.model_dump())
        return self.repository.create(matrix)

    def update_matrix(
        self,
        matrix_id: UUID,
        payload: WorkflowApprovalMatrixUpdate,
    ) -> WorkflowApprovalMatrix:
        matrix = self.repository.find_by_id(matrix_id)

        if not matrix:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Approval matrix not found",
            )

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(matrix, field, value)

        return self.repository.save(matrix)

    def delete_matrix(self, matrix_id: UUID) -> None:
        matrix = self.repository.find_by_id(matrix_id)

        if not matrix:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Approval matrix not found",
            )

        self.repository.delete(matrix)


class WorkflowInstanceService:
    def __init__(self, db: Session):
        self.db = db
        self.workflow_repository = WorkflowDefinitionRepository(db)
        self.repository = WorkflowInstanceRepository(db)
        self.step_repository = WorkflowInstanceStepRepository(db)
        self.notification_service = NotificationService(db)

    def list_instances(self) -> list[WorkflowInstance]:
        return self.repository.list()

    def get_instance(self, instance_id: UUID) -> WorkflowInstance:
        instance = self.repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        return instance

    def list_instance_steps(self, instance_id: UUID) -> list[WorkflowInstanceStep]:
        self.get_instance(instance_id)
        return self.step_repository.list_by_instance(instance_id)

    def create_instance(
        self,
        payload: WorkflowInstanceCreate,
        submitted_by_id: UUID | None = None,
    ) -> WorkflowInstance:
        workflow = self.workflow_repository.find_by_id(payload.workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        if not workflow.steps:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workflow definition has no steps",
            )

        sorted_steps = sorted(workflow.steps, key=lambda step: step.position)
        first_step = sorted_steps[0]
        has_approval_step = any(step.step_type.value == "approval" for step in sorted_steps)

        instance = WorkflowInstance(
            workflow_id=workflow.id,
            module=payload.module.strip().lower(),
            entity_type=payload.entity_type.strip().lower(),
            entity_id=payload.entity_id.strip(),
            status=(
                WorkflowInstanceStatus.pending_approval
                if has_approval_step
                else WorkflowInstanceStatus.submitted
            ),
            current_step_id=first_step.id,
            submitted_by_id=submitted_by_id,
            submitted_at=datetime.utcnow(),
            context_json=payload.context_json,
        )

        self.db.add(instance)
        self.db.flush()

        for index, step in enumerate(sorted_steps, start=1):
            instance_step = WorkflowInstanceStep(
                instance_id=instance.id,
                workflow_step_id=step.id,
                status=(
                    WorkflowInstanceStepStatus.active
                    if step.id == first_step.id
                    else WorkflowInstanceStepStatus.pending
                ),
                sequence=index,
            )
            self.db.add(instance_step)

        self.db.commit()
        self.db.refresh(instance)

        return instance


class WorkflowActionService:
    def __init__(self, db: Session):
        self.db = db
        self.instance_repository = WorkflowInstanceRepository(db)
        self.step_repository = WorkflowInstanceStepRepository(db)
        self.notification_service = NotificationService(db)
        self.history_repository = WorkflowApprovalHistoryRepository(db)

    def list_history(self, instance_id: UUID) -> list[WorkflowApprovalHistory]:
        instance = self.instance_repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        return self.history_repository.list_by_instance(instance_id)

    def _get_active_step(self, instance_id: UUID) -> WorkflowInstanceStep:
        steps = self.step_repository.list_by_instance(instance_id)

        for step in steps:
            if step.status == WorkflowInstanceStepStatus.active:
                return step

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow instance has no active step",
        )

    def _record_history(
        self,
        *,
        instance_id: UUID,
        instance_step_id: UUID | None,
        action_type: WorkflowActionType,
        actor_user_id: UUID | None,
        comment: str | None,
        payload_json: dict | None,
    ) -> WorkflowApprovalHistory:
        history = WorkflowApprovalHistory(
            instance_id=instance_id,
            instance_step_id=instance_step_id,
            action_type=action_type,
            actor_user_id=actor_user_id,
            comment=comment,
            payload_json=payload_json,
        )
        self.db.add(history)
        return history

    def approve(
        self,
        instance_id: UUID,
        actor_user_id: UUID,
        payload: WorkflowActionRequest,
    ) -> WorkflowInstance:
        instance = self.instance_repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        active_step = self._get_active_step(instance_id)
        steps = self.step_repository.list_by_instance(instance_id)
        active_step.status = WorkflowInstanceStepStatus.approved
        active_step.completed_at = datetime.utcnow()
        active_step.result_json = payload.payload_json

        next_step = next(
            (step for step in steps if step.sequence > active_step.sequence),
            None,
        )

        self._record_history(
            instance_id=instance.id,
            instance_step_id=active_step.id,
            action_type=WorkflowActionType.approved,
            actor_user_id=actor_user_id,
            comment=payload.comment,
            payload_json=payload.payload_json,
        )

        if next_step:
            next_step.status = WorkflowInstanceStepStatus.active
            instance.current_step_id = next_step.workflow_step_id
            instance.status = WorkflowInstanceStatus.pending_approval
        else:
            instance.current_step_id = None
            instance.status = WorkflowInstanceStatus.completed
            instance.completed_at = datetime.utcnow()

            self._record_history(
                instance_id=instance.id,
                instance_step_id=None,
                action_type=WorkflowActionType.completed,
                actor_user_id=actor_user_id,
                comment="Workflow completed",
                payload_json=None,
            )

        self.db.commit()
        self.db.refresh(instance)
        return instance

    def reject(
        self,
        instance_id: UUID,
        actor_user_id: UUID,
        payload: WorkflowActionRequest,
    ) -> WorkflowInstance:
        instance = self.instance_repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        active_step = self._get_active_step(instance_id)
        active_step.status = WorkflowInstanceStepStatus.rejected
        active_step.completed_at = datetime.utcnow()
        active_step.result_json = payload.payload_json

        instance.status = WorkflowInstanceStatus.rejected

        self._record_history(
            instance_id=instance.id,
            instance_step_id=active_step.id,
            action_type=WorkflowActionType.rejected,
            actor_user_id=actor_user_id,
            comment=payload.comment,
            payload_json=payload.payload_json,
        )

        self.db.commit()
        self.db.refresh(instance)
        return instance

    def return_instance(
        self,
        instance_id: UUID,
        actor_user_id: UUID,
        payload: WorkflowActionRequest,
    ) -> WorkflowInstance:
        instance = self.instance_repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        active_step = self._get_active_step(instance_id)
        active_step.status = WorkflowInstanceStepStatus.returned
        active_step.completed_at = datetime.utcnow()
        active_step.result_json = payload.payload_json

        instance.status = WorkflowInstanceStatus.returned

        self._record_history(
            instance_id=instance.id,
            instance_step_id=active_step.id,
            action_type=WorkflowActionType.returned,
            actor_user_id=actor_user_id,
            comment=payload.comment,
            payload_json=payload.payload_json,
        )

        self.db.commit()
        self.db.refresh(instance)
        return instance

    def cancel(
        self,
        instance_id: UUID,
        actor_user_id: UUID,
        payload: WorkflowActionRequest,
    ) -> WorkflowInstance:
        instance = self.instance_repository.find_by_id(instance_id)

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow instance not found",
            )

        instance.status = WorkflowInstanceStatus.cancelled

        self._record_history(
            instance_id=instance.id,
            instance_step_id=None,
            action_type=WorkflowActionType.cancelled,
            actor_user_id=actor_user_id,
            comment=payload.comment,
            payload_json=payload.payload_json,
        )

        self.db.commit()
        self.db.refresh(instance)
        return instance


class WorkflowEscalationRuleService:
    def __init__(self, db: Session):
        self.workflow_repository = WorkflowDefinitionRepository(db)
        self.repository = WorkflowEscalationRuleRepository(db)

    def list_by_workflow(self, workflow_id: UUID) -> list[WorkflowEscalationRule]:
        workflow = self.workflow_repository.find_by_id(workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        return self.repository.list_by_workflow(workflow_id)

    def get_rule(self, rule_id: UUID) -> WorkflowEscalationRule:
        rule = self.repository.find_by_id(rule_id)

        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow escalation rule not found",
            )

        return rule

    def create_rule(self, payload: WorkflowEscalationRuleCreate) -> WorkflowEscalationRule:
        workflow = self.workflow_repository.find_by_id(payload.workflow_id)

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow definition not found",
            )

        if payload.step_id is not None:
            step_ids = {step.id for step in workflow.steps}

            if payload.step_id not in step_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Escalation step does not belong to workflow",
                )

        rule = WorkflowEscalationRule(
            workflow_id=payload.workflow_id,
            step_id=payload.step_id,
            name=payload.name.strip(),
            trigger_after_hours=payload.trigger_after_hours,
            action=payload.action,
            target_role_id=payload.target_role_id,
            target_user_id=payload.target_user_id,
            is_active=payload.is_active,
            config_json=payload.config_json,
        )

        return self.repository.create(rule)

    def update_rule(
        self,
        rule_id: UUID,
        payload: WorkflowEscalationRuleUpdate,
    ) -> WorkflowEscalationRule:
        rule = self.get_rule(rule_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "step_id" in update_data and update_data["step_id"] is not None:
            workflow = self.workflow_repository.find_by_id(rule.workflow_id)

            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow definition not found",
                )

            step_ids = {step.id for step in workflow.steps}

            if update_data["step_id"] not in step_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Escalation step does not belong to workflow",
                )

        for field, value in update_data.items():
            if field == "name" and isinstance(value, str):
                value = value.strip()

            setattr(rule, field, value)

        return self.repository.save(rule)

    def delete_rule(self, rule_id: UUID) -> None:
        rule = self.get_rule(rule_id)
        self.repository.delete(rule)

    def list_active_rules(self) -> list[WorkflowEscalationRule]:
        return self.repository.list_active()


class WorkflowEscalationProcessorService:
    def __init__(self, db: Session):
        self.db = db
        self.rule_repository = WorkflowEscalationRuleRepository(db)
        self.instance_repository = WorkflowInstanceRepository(db)
        self.step_repository = WorkflowInstanceStepRepository(db)
        self.notification_service = NotificationService(db)

    def assign_due_dates_for_active_steps(self) -> int:
        now = datetime.utcnow()
        active_rules = self.rule_repository.list_active()
        rule_lookup = {}

        for rule in active_rules:
            key = (rule.workflow_id, rule.step_id)
            existing = rule_lookup.get(key)

            if existing is None or rule.trigger_after_hours < existing.trigger_after_hours:
                rule_lookup[key] = rule

        instances = self.instance_repository.list()
        updated_count = 0

        for instance in instances:
            if instance.status not in {
                WorkflowInstanceStatus.pending_approval,
                WorkflowInstanceStatus.submitted,
            }:
                continue

            steps = self.step_repository.list_by_instance(instance.id)

            for step in steps:
                if step.status != WorkflowInstanceStepStatus.active or step.due_at is not None:
                    continue

                step_rule = rule_lookup.get((instance.workflow_id, step.workflow_step_id))
                workflow_rule = rule_lookup.get((instance.workflow_id, None))
                rule = step_rule or workflow_rule

                if not rule:
                    continue

                step.due_at = now + timedelta(hours=rule.trigger_after_hours)
                updated_count += 1

        if updated_count:
            self.db.commit()

        return updated_count

    def process_overdue_steps(self) -> dict:
        now = datetime.utcnow()
        rules = self.rule_repository.list_active()
        overdue_steps = self.step_repository.list_overdue_active_steps(now)

        processed = {
            "checked": len(overdue_steps),
            "notified": 0,
            "escalated": 0,
            "auto_approved": 0,
            "auto_rejected": 0,
            "skipped": 0,
        }

        for step in overdue_steps:
            instance = self.instance_repository.find_by_id(step.instance_id)

            if not instance:
                processed["skipped"] += 1
                continue

            matching_rules = [
                rule
                for rule in rules
                if rule.workflow_id == instance.workflow_id
                and (rule.step_id is None or rule.step_id == step.workflow_step_id)
            ]

            if not matching_rules:
                processed["skipped"] += 1
                continue

            matching_rules.sort(key=lambda rule: rule.trigger_after_hours)
            rule = matching_rules[0]

            if rule.action.value == "notify":
                self._create_escalation_notification(
                    instance,
                    step,
                    rule,
                    "SLA notification triggered",
                )
                self._record_escalation_history(instance, step, rule, "SLA notification triggered")
                processed["notified"] += 1

            elif rule.action.value == "escalate":
                step.assigned_role_id = rule.target_role_id or step.assigned_role_id
                step.assigned_to_user_id = rule.target_user_id or step.assigned_to_user_id
                self._create_escalation_notification(
                    instance,
                    step,
                    rule,
                    "Workflow step escalated",
                )
                self._record_escalation_history(instance, step, rule, "Workflow step escalated")
                processed["escalated"] += 1

            elif rule.action.value == "auto_approve":
                step.status = WorkflowInstanceStepStatus.approved
                step.completed_at = now
                self._record_escalation_history(instance, step, rule, "Workflow step auto-approved by escalation rule")
                processed["auto_approved"] += 1

            elif rule.action.value == "auto_reject":
                step.status = WorkflowInstanceStepStatus.rejected
                step.completed_at = now
                instance.status = WorkflowInstanceStatus.rejected
                self._record_escalation_history(instance, step, rule, "Workflow step auto-rejected by escalation rule")
                processed["auto_rejected"] += 1

        self.db.commit()
        return processed

    def run_once(self) -> dict:
        due_dates_assigned = self.assign_due_dates_for_active_steps()
        result = self.process_overdue_steps()
        result["due_dates_assigned"] = due_dates_assigned
        return result

    def _create_escalation_notification(
        self,
        instance: WorkflowInstance,
        step: WorkflowInstanceStep,
        rule: WorkflowEscalationRule,
        message: str,
    ) -> None:
        recipient_user_id = rule.target_user_id or step.assigned_to_user_id
        recipient_role_id = rule.target_role_id or step.assigned_role_id

        if recipient_user_id is None and recipient_role_id is None:
            return

        payload = NotificationEventCreate(
            event_type="workflow_escalation",
            source_module="workflows",
            source_entity_type="workflow_instance",
            source_entity_id=str(instance.id),
            payload_json={
                "workflow_id": str(instance.workflow_id),
                "instance_id": str(instance.id),
                "instance_step_id": str(step.id),
                "workflow_step_id": str(step.workflow_step_id),
                "rule_id": str(rule.id),
                "rule_name": rule.name,
                "action": rule.action.value,
                "message": message,
            },
            recipient_user_id=recipient_user_id,
            recipient_role_id=recipient_role_id,
            channel=NotificationChannel.in_app,
            subject="Workflow escalation",
            body=f"{message}: {rule.name}",
        )
        self.notification_service.create_event(payload)

    def _record_escalation_history(
        self,
        instance: WorkflowInstance,
        step: WorkflowInstanceStep,
        rule: WorkflowEscalationRule,
        comment: str,
    ) -> None:
        history = WorkflowApprovalHistory(
            instance_id=instance.id,
            instance_step_id=step.id,
            action_type=WorkflowActionType.escalated,
            actor_user_id=None,
            comment=comment,
            payload_json={
                "rule_id": str(rule.id),
                "rule_name": rule.name,
                "action": rule.action.value,
                "trigger_after_hours": rule.trigger_after_hours,
            },
        )
        self.db.add(history)


