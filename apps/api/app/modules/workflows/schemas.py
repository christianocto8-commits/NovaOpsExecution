from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.workflows.models import WorkflowActionType, WorkflowApproverType, WorkflowEscalationAction, WorkflowDefinitionStatus, WorkflowInstanceStatus, WorkflowInstanceStepStatus, WorkflowStepType


class WorkflowStepCreate(BaseModel):
    code: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=255)
    step_type: WorkflowStepType
    position: int = 0
    config_json: dict | None = None


class WorkflowStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    code: str
    name: str
    step_type: WorkflowStepType
    position: int
    config_json: dict | None = None


class WorkflowConditionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=255)
    expression_json: dict


class WorkflowConditionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    code: str
    name: str
    expression_json: dict


class WorkflowTransitionCreate(BaseModel):
    from_step_id: UUID
    to_step_id: UUID
    condition_id: UUID | None = None
    label: str | None = Field(default=None, max_length=120)


class WorkflowTransitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    from_step_id: UUID
    to_step_id: UUID
    condition_id: UUID | None = None
    label: str | None = None


class WorkflowDefinitionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    module: str = Field(min_length=2, max_length=120)
    metadata_json: dict | None = None
    steps: list[WorkflowStepCreate] = []


class WorkflowDefinitionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    module: str | None = Field(default=None, min_length=2, max_length=120)
    status: WorkflowDefinitionStatus | None = None
    is_active: bool | None = None
    metadata_json: dict | None = None


class WorkflowDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None = None
    module: str
    status: WorkflowDefinitionStatus
    version: int
    is_active: bool
    metadata_json: dict | None = None
    created_at: datetime
    updated_at: datetime
    steps: list[WorkflowStepRead] = []


class MessageResponse(BaseModel):
    message: str

class WorkflowApprovalMatrixCreate(BaseModel):
    workflow_id: UUID
    step_id: UUID
    approver_type: WorkflowApproverType
    approver_role_id: UUID | None = None
    approver_user_id: UUID | None = None
    outlet_id: UUID | None = None
    sequence: int = 1
    is_required: bool = True
    sla_hours: int | None = None
    rule_json: dict | None = None


class WorkflowApprovalMatrixUpdate(BaseModel):
    approver_type: WorkflowApproverType | None = None
    approver_role_id: UUID | None = None
    approver_user_id: UUID | None = None
    outlet_id: UUID | None = None
    sequence: int | None = None
    is_required: bool | None = None
    sla_hours: int | None = None
    rule_json: dict | None = None


class WorkflowApprovalMatrixRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    step_id: UUID
    approver_type: WorkflowApproverType
    approver_role_id: UUID | None = None
    approver_user_id: UUID | None = None
    outlet_id: UUID | None = None
    sequence: int
    is_required: bool
    sla_hours: int | None = None
    rule_json: dict | None = None
    created_at: datetime
    updated_at: datetime


class WorkflowInstanceCreate(BaseModel):
    workflow_id: UUID
    module: str = Field(min_length=2, max_length=120)
    entity_type: str = Field(min_length=2, max_length=120)
    entity_id: str = Field(min_length=1, max_length=120)
    context_json: dict | None = None


class WorkflowInstanceStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instance_id: UUID
    workflow_step_id: UUID
    status: WorkflowInstanceStepStatus
    sequence: int
    assigned_to_user_id: UUID | None = None
    assigned_role_id: UUID | None = None
    due_at: datetime | None = None
    completed_at: datetime | None = None
    result_json: dict | None = None


class WorkflowInstanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    module: str
    entity_type: str
    entity_id: str
    status: WorkflowInstanceStatus
    current_step_id: UUID | None = None
    submitted_by_id: UUID | None = None
    submitted_at: datetime | None = None
    completed_at: datetime | None = None
    context_json: dict | None = None
    created_at: datetime
    updated_at: datetime
    has_escalation: bool = False


class WorkflowActionRequest(BaseModel):
    comment: str | None = None
    payload_json: dict | None = None


class WorkflowApprovalHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    instance_id: UUID
    instance_step_id: UUID | None = None
    action_type: WorkflowActionType
    actor_user_id: UUID | None = None
    comment: str | None = None
    payload_json: dict | None = None
    created_at: datetime


class WorkflowEscalationRuleCreate(BaseModel):
    workflow_id: UUID
    step_id: UUID | None = None
    name: str = Field(min_length=2, max_length=255)
    trigger_after_hours: int = Field(ge=1)
    action: WorkflowEscalationAction
    target_role_id: UUID | None = None
    target_user_id: UUID | None = None
    is_active: bool = True
    config_json: dict | None = None


class WorkflowEscalationRuleUpdate(BaseModel):
    step_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=255)
    trigger_after_hours: int | None = Field(default=None, ge=1)
    action: WorkflowEscalationAction | None = None
    target_role_id: UUID | None = None
    target_user_id: UUID | None = None
    is_active: bool | None = None
    config_json: dict | None = None


class WorkflowEscalationRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    step_id: UUID | None = None
    name: str
    trigger_after_hours: int
    action: WorkflowEscalationAction
    target_role_id: UUID | None = None
    target_user_id: UUID | None = None
    is_active: bool
    config_json: dict | None = None
    created_at: datetime
    updated_at: datetime

