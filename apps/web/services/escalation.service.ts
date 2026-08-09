import { api } from "@/services/api";
import type {
  UUID,
  WorkflowEscalationProcessResult,
  WorkflowEscalationRule,
  WorkflowEscalationRuleCreate,
  WorkflowEscalationRuleUpdate,
} from "@/features/workflows/types";

export const escalationService = {
  listByWorkflow(workflowId: UUID) {
    return api<WorkflowEscalationRule[]>(`/api/v1/workflows/escalation-rules/${workflowId}`);
  },

  create(payload: WorkflowEscalationRuleCreate) {
    return api<WorkflowEscalationRule>("/api/v1/workflows/escalation-rules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(ruleId: UUID, payload: WorkflowEscalationRuleUpdate) {
    return api<WorkflowEscalationRule>(`/api/v1/workflows/escalation-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(ruleId: UUID) {
    return api<{ message: string }>(`/api/v1/workflows/escalation-rules/${ruleId}`, {
      method: "DELETE",
    });
  },

  process() {
    return api<WorkflowEscalationProcessResult>("/api/v1/workflows/escalations/process", {
      method: "POST",
    });
  },

  assignDueDates() {
    return api<{ due_dates_assigned: number }>("/api/v1/workflows/escalations/assign-due-dates", {
      method: "POST",
    });
  },
};
