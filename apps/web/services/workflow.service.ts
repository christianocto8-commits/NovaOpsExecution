import { api } from "@/services/api";
import type {
  WorkflowActionRequest,
  WorkflowApprovalHistory,
  WorkflowDefinition,
  WorkflowDefinitionCreate,
  WorkflowDefinitionUpdate,
  WorkflowInstance,
  WorkflowInstanceCreate,
  WorkflowInstanceStep,
  UUID,
} from "@/features/workflows/types";

export const workflowService = {
  list() {
    return api<WorkflowDefinition[]>("/api/v1/workflows");
  },

  get(workflowId: UUID) {
    return api<WorkflowDefinition>(`/api/v1/workflows/${workflowId}`);
  },

  create(payload: WorkflowDefinitionCreate) {
    return api<WorkflowDefinition>("/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(workflowId: UUID, payload: WorkflowDefinitionUpdate) {
    return api<WorkflowDefinition>(`/api/v1/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(workflowId: UUID) {
    return api<{ message: string }>(`/api/v1/workflows/${workflowId}`, {
      method: "DELETE",
    });
  },

  listInstances() {
    return api<WorkflowInstance[]>("/api/v1/workflows/instances");
  },

  getInstance(instanceId: UUID) {
    return api<WorkflowInstance>(`/api/v1/workflows/instances/${instanceId}`);
  },

  createInstance(payload: WorkflowInstanceCreate) {
    return api<WorkflowInstance>("/api/v1/workflows/instances", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listInstanceSteps(instanceId: UUID) {
    return api<WorkflowInstanceStep[]>(
      `/api/v1/workflows/instances/${instanceId}/steps`,
    );
  },

  listHistory(instanceId: UUID) {
    return api<WorkflowApprovalHistory[]>(
      `/api/v1/workflows/instances/${instanceId}/history`,
    );
  },

  approve(instanceId: UUID, payload: WorkflowActionRequest) {
    return api<WorkflowInstance>(`/api/v1/workflows/instances/${instanceId}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  reject(instanceId: UUID, payload: WorkflowActionRequest) {
    return api<WorkflowInstance>(`/api/v1/workflows/instances/${instanceId}/reject`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  returnInstance(instanceId: UUID, payload: WorkflowActionRequest) {
    return api<WorkflowInstance>(`/api/v1/workflows/instances/${instanceId}/return`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  cancel(instanceId: UUID, payload: WorkflowActionRequest) {
    return api<WorkflowInstance>(`/api/v1/workflows/instances/${instanceId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
