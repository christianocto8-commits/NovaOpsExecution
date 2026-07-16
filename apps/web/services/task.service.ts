import { api } from "@/services/api";
import type { Task, TaskFormState, TaskPriority, TaskStatus } from "@/features/tasks/types";

export type BackendTaskStatus = "open" | "in_progress" | "blocked" | "completed" | "cancelled";
export type BackendTaskPriority = "low" | "medium" | "high" | "urgent";

export type BackendTask = {
  id: number;
  title: string;
  description: string | null;
  outlet_id: number;
  outlet_name?: string | null;
  assigned_to: number | null;
  created_by: number;
  source_type: string | null;
  source_id: number | null;
  priority: BackendTaskPriority;
  status: BackendTaskStatus;
  due_date: string | null;
  completed_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type BackendTaskCreate = {
  title: string;
  description: string | null;
  assigned_to: number | null;
  priority: BackendTaskPriority;
  due_date: string | null;
  source_type: string | null;
  source_id: number | null;
};

type BackendTaskUpdate = Partial<
  Pick<BackendTaskCreate, "title" | "description" | "assigned_to" | "priority" | "due_date">
>;

const LOCAL_FORM_TEMPLATE_PREFIX = "local_form_template:";

function toFrontendStatus(status: BackendTaskStatus): TaskStatus {
  if (status === "completed") return "Completed";
  if (status === "in_progress" || status === "blocked") return "In Progress";
  return "Pending";
}

function toBackendPriority(priority: TaskPriority): BackendTaskPriority {
  if (priority === "Critical") return "urgent";
  if (priority === "High") return "high";
  if (priority === "Low") return "low";
  return "medium";
}

function toFrontendPriority(priority: BackendTaskPriority): TaskPriority {
  if (priority === "urgent") return "Critical";
  if (priority === "high") return "High";
  if (priority === "low") return "Low";
  return "Medium";
}

function formatDueDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function parseSourceFormTemplateId(task: BackendTask) {
  if (task.source_type?.startsWith(LOCAL_FORM_TEMPLATE_PREFIX)) {
    return task.source_type.slice(LOCAL_FORM_TEMPLATE_PREFIX.length);
  }

  if (task.source_type === "form_template" && task.source_id) {
    return String(task.source_id);
  }

  return "FORM-OPENING";
}

function resolveTaskOutletHeader(form: TaskFormState) {
  if (form.recurrence === "once") {
    return form.outletId ?? form.targetOutletIds?.[0] ?? undefined;
  }

  return form.targetOutletIds?.[0] ?? form.outletId ?? undefined;
}

export function mapBackendTask(task: BackendTask): Task {
  const outletName = task.outlet_name ?? `Outlet ${task.outlet_id}`;

  return {
    id: String(task.id),
    title: task.title,
    outlet: outletName,
    status: toFrontendStatus(task.status),
    priority: toFrontendPriority(task.priority),
    assignee: task.assigned_to ? `User ${task.assigned_to}` : "Outlet Team",
    due: formatDueDate(task.due_date),
    description: task.description ?? "",
    formTemplateId: parseSourceFormTemplateId(task),
    recurrence: "once",
    shifts: ["morning"],
    targetOutlets: [outletName],
    autoPublish: false,
    dueTime: formatDueDate(task.due_date).slice(11, 16) || "09:00",
    weeklyPublishDay: "sunday",
    activity: [
      {
        id: `ACT-${task.id}-backend`,
        type: "created",
        title: "Loaded from backend",
        description: "This task is synced from NovaOps API.",
        actor: "NovaOps API",
        timestamp: task.updated_at,
      },
    ],
  };
}

function toBackendPayload(form: TaskFormState): BackendTaskCreate {
  const numericTemplateId = Number(form.formTemplateId);
  const isBackendTemplate = Number.isFinite(numericTemplateId);

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    assigned_to: null,
    priority: toBackendPriority(form.priority),
    due_date: form.recurrence === "once" && form.due ? new Date(form.due).toISOString() : null,
    source_type: isBackendTemplate
      ? "form_template"
      : `${LOCAL_FORM_TEMPLATE_PREFIX}${form.formTemplateId}`,
    source_id: isBackendTemplate ? numericTemplateId : null,
  };
}

export const taskService = {
  async list() {
    const tasks = await api<BackendTask[]>("/api/v1/tasks");
    return tasks.map(mapBackendTask);
  },

  async create(form: TaskFormState) {
    const task = await api<BackendTask>("/api/v1/tasks", {
      method: "POST",
      headers: resolveTaskOutletHeader(form)
        ? { "X-Outlet-Id": resolveTaskOutletHeader(form) as string }
        : undefined,
      body: JSON.stringify(toBackendPayload(form)),
    });
    return mapBackendTask(task);
  },

  async update(taskId: string, form: TaskFormState) {
    const payload: BackendTaskUpdate = toBackendPayload(form);
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return mapBackendTask(task);
  },

  async updateStatus(taskId: string, status: BackendTaskStatus) {
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapBackendTask(task);
  },

  async remove(taskId: string) {
    return api<void>(`/api/v1/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
};