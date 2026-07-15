import { api } from "@/services/api";
import type {
  UUID,
  WorkflowApprovalMatrix,
  WorkflowApprovalMatrixCreate,
  WorkflowApprovalMatrixUpdate,
} from "@/features/workflows/types";

export const approvalService = {
  listByWorkflow(workflowId: UUID) {
    return api<WorkflowApprovalMatrix[]>(
      `/api/v1/workflows/approval-matrix/${workflowId}`,
    );
  },

  create(payload: WorkflowApprovalMatrixCreate) {
    return api<WorkflowApprovalMatrix>("/api/v1/workflows/approval-matrix", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(matrixId: UUID, payload: WorkflowApprovalMatrixUpdate) {
    return api<WorkflowApprovalMatrix>(
      `/api/v1/workflows/approval-matrix/${matrixId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  remove(matrixId: UUID) {
    return api<{ message: string }>(
      `/api/v1/workflows/approval-matrix/${matrixId}`,
      { method: "DELETE" },
    );
  },
};
