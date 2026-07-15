import type {
  UUID,
  WorkflowApprovalMatrix,
  WorkflowApprovalMatrixCreate,
  WorkflowApprovalMatrixUpdate,
} from "@/features/workflows/types";

export type ApprovalMatrixFormState = {
  step_order: string;
  step_name: string;
  approver_role_id: string;
  approver_user_id: string;
  required_approval_count: string;
  is_required: boolean;
};

export const emptyApprovalMatrixForm: ApprovalMatrixFormState = {
  step_order: "1",
  step_name: "",
  approver_role_id: "",
  approver_user_id: "",
  required_approval_count: "1",
  is_required: true,
};

export function approvalMatrixToForm(matrix: WorkflowApprovalMatrix): ApprovalMatrixFormState {
  return {
    step_order: String(matrix.step_order ?? 1),
    step_name: matrix.step_name ?? "",
    approver_role_id: matrix.approver_role_id ?? "",
    approver_user_id: matrix.approver_user_id ?? "",
    required_approval_count: String(matrix.required_approval_count ?? 1),
    is_required: matrix.is_required ?? true,
  };
}

export function buildApprovalMatrixCreatePayload(
  workflowId: UUID,
  form: ApprovalMatrixFormState,
): WorkflowApprovalMatrixCreate {
  return {
    workflow_id: workflowId,
    step_order: Number(form.step_order || 1),
    step_name: form.step_name.trim() || null,
    approver_role_id: form.approver_role_id.trim() || null,
    approver_user_id: form.approver_user_id.trim() || null,
    required_approval_count: Number(form.required_approval_count || 1),
    is_required: form.is_required,
  };
}

export function buildApprovalMatrixUpdatePayload(
  form: ApprovalMatrixFormState,
): WorkflowApprovalMatrixUpdate {
  return {
    step_order: Number(form.step_order || 1),
    step_name: form.step_name.trim() || null,
    approver_role_id: form.approver_role_id.trim() || null,
    approver_user_id: form.approver_user_id.trim() || null,
    required_approval_count: Number(form.required_approval_count || 1),
    is_required: form.is_required,
  };
}
