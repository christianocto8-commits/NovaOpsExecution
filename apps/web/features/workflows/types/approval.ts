import type { UUID } from "./workflow";

export interface WorkflowApprovalMatrix {
  id: UUID;
  workflow_id: UUID;
  step_order: number;
  step_name?: string | null;
  approver_role_id?: UUID | null;
  approver_user_id?: UUID | null;
  required_approval_count?: number;
  is_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowApprovalMatrixCreate {
  workflow_id: UUID;
  step_order: number;
  step_name?: string | null;
  approver_role_id?: UUID | null;
  approver_user_id?: UUID | null;
  required_approval_count?: number;
  is_required?: boolean;
}

export interface WorkflowApprovalMatrixUpdate {
  step_order?: number;
  step_name?: string | null;
  approver_role_id?: UUID | null;
  approver_user_id?: UUID | null;
  required_approval_count?: number;
  is_required?: boolean;
}
