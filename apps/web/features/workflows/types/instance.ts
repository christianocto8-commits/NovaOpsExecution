import type { UUID } from "./workflow";

export type WorkflowInstanceStatus =
  "open" | "approved" | "rejected" | "cancelled" | "escalated" | string;

export interface WorkflowInstance {
  id: UUID;
  workflow_id: UUID;
  module: string;
  entity_type: string;
  entity_id: string;
  status: WorkflowInstanceStatus;
  current_step_id?: UUID | null;
  submitted_by_id?: UUID | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  context_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  has_escalation?: boolean;
}

export interface WorkflowInstanceCreate {
  workflow_id: UUID;
  module: string;
  entity_type: string;
  entity_id: string;
  context_json?: Record<string, unknown> | null;
}

export interface WorkflowInstanceStep {
  id: UUID;
  instance_id: UUID;
  workflow_step_id: UUID;
  status?: string;
  sequence?: number;
  assigned_to_user_id?: UUID | null;
  assigned_role_id?: UUID | null;
  due_at?: string | null;
  completed_at?: string | null;
  result_json?: Record<string, unknown> | null;
}

export interface WorkflowActionRequest {
  comment?: string | null;
  payload_json?: Record<string, unknown> | null;
}

export interface WorkflowApprovalHistory {
  id: UUID;
  instance_id: UUID;
  instance_step_id?: UUID | null;
  action_type: string;
  comment?: string | null;
  actor_user_id?: UUID | null;
  payload_json?: Record<string, unknown> | null;
  created_at?: string;
}
