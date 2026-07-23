import { api } from "@/services/api";
import type {
  NotificationDelivery,
  NotificationEvent,
  NotificationEventCreate,
  NotificationTemplate,
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  UUID,
  WorkflowNotificationTemplate,
  WorkflowNotificationTemplateCreate,
  WorkflowNotificationTemplateUpdate,
} from "@/features/workflows/types";

export const notificationService = {
  listTemplates() {
    return api<NotificationTemplate[]>("/api/v1/notifications/templates");
  },

  createTemplate(payload: NotificationTemplateCreate) {
    return api<NotificationTemplate>("/api/v1/notifications/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTemplate(templateId: UUID, payload: NotificationTemplateUpdate) {
    return api<NotificationTemplate>(`/api/v1/notifications/templates/${templateId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  removeTemplate(templateId: UUID) {
    return api<{ message: string }>(`/api/v1/notifications/templates/${templateId}`, {
      method: "DELETE",
    });
  },

  listWorkflowTemplates(workflowId: UUID) {
    return api<WorkflowNotificationTemplate[]>(
      `/api/v1/workflow-notifications/templates?workflow_id=${workflowId}`,
    );
  },

  createWorkflowTemplate(payload: WorkflowNotificationTemplateCreate) {
    return api<WorkflowNotificationTemplate>("/api/v1/workflow-notifications/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateWorkflowTemplate(
    templateId: UUID,
    payload: WorkflowNotificationTemplateUpdate,
  ) {
    return api<WorkflowNotificationTemplate>(
      `/api/v1/workflow-notifications/templates/${templateId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  removeWorkflowTemplate(templateId: UUID) {
    return api<{ message: string }>(
      `/api/v1/workflow-notifications/templates/${templateId}`,
      { method: "DELETE" },
    );
  },

  createEvent(payload: NotificationEventCreate) {
    return api<NotificationEvent>("/api/v1/notifications/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listMine() {
    return api<NotificationDelivery[]>("/api/v1/notifications/me");
  },

  getUnreadCount() {
    return api<{ unread_count: number }>("/api/v1/notifications/me/unread-count");
  },

  markRead(deliveryIds?: string[]) {
    return api<{ message: string }>("/api/v1/notifications/me/mark-read", {
      method: "POST",
      body: JSON.stringify(
        deliveryIds && deliveryIds.length > 0 ? { delivery_ids: deliveryIds } : {},
      ),
    });
  },

  processPending() {
    return api<Record<string, unknown>>("/api/v1/notifications/process", {
      method: "POST",
    });
  },
};
