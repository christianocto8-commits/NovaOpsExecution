import { api } from "@/services/api";
import { cacheTasks, getCachedTasks } from "@/lib/offline/store";
import type {
  Task,
  TaskActivity,
  TaskActivityType,
  TaskFormState,
  TaskPriority,
  TaskReviewStatus,
  TaskShift,
  TaskStatus,
} from "@/features/tasks/types";

export type OutletMember = {
  id: number;
  name: string;
  email: string;
  role_name: string | null;
};

export type TaskAssignmentResponse = {
  id: number;
  task_id: number;
  user_id: number;
  assigned_by: number | null;
  role: string;
  created_at: string;
  user?: OutletMember | null;
};

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
  form_template_id?: number | null;
  form_template_name?: string | null;
  checklist_field_count?: number;
  checklist_preview?: string[];
  priority: BackendTaskPriority;
  status: BackendTaskStatus;
  due_date: string | null;
  completed_at: string | null;
  verified_at: string | null;
  expired_at?: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejected_at?: string | null;
  review_note?: string | null;
  schedule_id: number | null;
  shift: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "once" | null;
  due_time: string | null;
  weekly_publish_day: string | null;
  auto_publish: boolean | null;
  capa_root_cause?: string | null;
  capa_before_evidence_url?: string | null;
  capa_after_evidence_url?: string | null;
  capa_evidence_note?: string | null;
  comments?: BackendTaskComment[];
  assignments?: BackendTaskAssignment[];
  created_at: string;
  updated_at: string;
};

export type BackendTaskComment = {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  evidence_url: string | null;
  event_type: string;
  previous_value: string | null;
  new_value: string | null;
  created_at: string;
};

export type BackendTaskAssignment = {
  id: number;
  user_id: number;
  user?: { id: number; name: string };
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
  Pick<
    BackendTaskCreate,
    "title" | "description" | "assigned_to" | "priority" | "due_date" | "source_type" | "source_id"
  >
>;

const LOCAL_FORM_TEMPLATE_PREFIX = "local_form_template:";

export function isLocalFormTemplateSource(sourceType?: string | null) {
  return Boolean(sourceType?.startsWith(LOCAL_FORM_TEMPLATE_PREFIX));
}

function isValidBackendFormTemplateId(value: unknown): value is number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric > 0;
}

export function hasResolvableBackendFormTemplate(task: {
  formTemplateId?: string;
  sourceType?: string;
}) {
  if (isLocalFormTemplateSource(task.sourceType)) {
    return false;
  }

  return isValidBackendFormTemplateId(task.formTemplateId);
}

function toFrontendStatus(status: BackendTaskStatus): TaskStatus {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "in_progress" || status === "blocked") return "In Progress";
  return "Pending";
}

export function toBackendStatus(status: TaskStatus): BackendTaskStatus {
  if (status === "Completed") return "completed";
  if (status === "Cancelled") return "cancelled";
  if (status === "In Progress") return "in_progress";
  return "open";
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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseSourceFormTemplateId(task: BackendTask) {
  if (isValidBackendFormTemplateId(task.form_template_id)) {
    return String(task.form_template_id);
  }

  if (
    (task.source_type === "form_template" || task.source_type === "field_audit") &&
    isValidBackendFormTemplateId(task.source_id)
  ) {
    return String(task.source_id);
  }

  if (isLocalFormTemplateSource(task.source_type)) {
    return task.source_type!.slice(LOCAL_FORM_TEMPLATE_PREFIX.length);
  }

  return "";
}

function deriveReviewStatus(task: BackendTask): TaskReviewStatus | undefined {
  if (task.approved_at) return "approved";
  if (task.rejected_at) return "rejected";
  if (task.status === "completed") return "pending_review";
  return undefined;
}

export function mapBackendTask(task: BackendTask): Task {
  const outletName = task.outlet_name?.trim() || `Outlet ${task.outlet_id}`;
  const recurrence = task.recurrence ?? "once";
  const shifts: TaskShift[] =
    recurrence === "weekly" || recurrence === "monthly"
      ? []
      : task.shift
        ? [task.shift as TaskShift]
        : ["morning"];
  const reviewStatus = deriveReviewStatus(task);

  return {
    id: String(task.id),
    title: task.title,
    outlet: outletName,
    outletId: String(task.outlet_id),
    status: toFrontendStatus(task.status),
    priority: toFrontendPriority(task.priority),
    assignee: task.assigned_to ? `User ${task.assigned_to}` : "Outlet Team",
    assignedToId: task.assigned_to,
    due: formatDueDate(task.due_date),
    description: task.description ?? "",
    formTemplateId: parseSourceFormTemplateId(task),
    formTemplateName: task.form_template_name ?? undefined,
    checklistFieldCount: task.checklist_field_count ?? 0,
    checklistPreview: task.checklist_preview ?? [],
    sourceType: task.source_type ?? undefined,
    sourceId: task.source_id != null ? String(task.source_id) : undefined,
    backendStatus: task.status,
    expiredAt: task.expired_at ?? undefined,
    verifiedAt: task.verified_at ?? undefined,
    approvedAt: task.approved_at ?? undefined,
    capaRootCause: task.capa_root_cause ?? undefined,
    capaBeforeEvidenceUrl: task.capa_before_evidence_url ?? undefined,
    capaAfterEvidenceUrl: task.capa_after_evidence_url ?? undefined,
    capaEvidenceNote: task.capa_evidence_note ?? undefined,
    execution: reviewStatus
      ? {
          operatorName: "",
          operatorPosition: "Crew",
          note: "",
          evidence: [],
          formResponses: {},
          completedAt: task.completed_at ?? task.updated_at,
          reviewStatus,
          reviewedAt: task.rejected_at ?? task.approved_at ?? undefined,
          reviewNote: task.review_note ?? undefined,
        }
      : undefined,
    recurrence,
    shifts,
    targetOutlets: [outletName],
    targetOutletIds: [String(task.outlet_id)],
    autoPublish: task.auto_publish ?? false,
    dueTime: task.due_time ?? (formatDueDate(task.due_date).slice(11, 16) || "09:00"),
    weeklyPublishDay: (task.weekly_publish_day as Task["weeklyPublishDay"]) ?? "sunday",
    activity:
      task.comments && task.comments.length > 0
        ? task.comments.map(commentToActivity)
        : [
            {
              id: `ACT-${task.id}-backend`,
              type: "created",
              title: task.schedule_id ? "Auto-published from schedule" : "Loaded from backend",
              description: task.schedule_id
                ? "This task was generated by a recurring schedule."
                : "This task is synced from NovaOps API.",
              actor: "NovaOps API",
              timestamp: task.updated_at,
            },
          ],
  };
}

function eventTypeToActivityType(eventType: string): TaskActivityType {
  if (eventType === "created" || eventType === "task.created") return "created";
  if (eventType === "assigned" || eventType === "task.assigned" || eventType === "task_assigned") return "assigned";
  if (eventType === "updated" || eventType === "task_assignment_updated") return "updated";
  if (eventType === "draft_saved") return "draft_saved";
  if (eventType === "form_submitted") return "form_submitted";
  if (eventType === "evidence_submitted") return "evidence_submitted";
  if (eventType === "review_approved") return "review_approved";
  if (eventType === "review_rejected") return "review_rejected";
  if (eventType === "completed" || eventType === "task.completed") return "completed";
  return "created";
}

function eventTypeToTitle(eventType: string, comment: string): string {
  if (comment) return comment;
  const map: Record<string, string> = {
    created: "Task dibuat",
    "task.created": "Task dibuat",
    assigned: "Task ditugaskan",
    "task.assigned": "Task ditugaskan",
    task_assigned: "Task ditugaskan",
    updated: "Task diperbarui",
    "task_assignment_updated": "Penugasan diperbarui",
    draft_saved: "Draft disimpan",
    form_submitted: "Form disubmit",
    evidence_submitted: "Bukti evidence dikirim",
    review_approved: "Review disetujui",
    review_rejected: "Review ditolak",
    completed: "Task selesai",
    "task.completed": "Task selesai",
    deleted: "Task dihapus",
    status_changed: "Status berubah",
    "checklist.failed": "Checklist gagal",
    capa_verified: "CAPA diverifikasi",
    capa_evidence: "Bukti CAPA dikirim",
    capa_rejected: "CAPA ditolak",
  };
  return map[eventType] ?? eventType;
}

function commentToActivity(comment: BackendTaskComment): TaskActivity {
  return {
    id: `CMT-${comment.id}`,
    type: eventTypeToActivityType(comment.event_type),
    title: eventTypeToTitle(comment.event_type, comment.comment),
    description: [
      comment.previous_value ? `Dari: ${comment.previous_value}` : "",
      comment.new_value ? `Ke: ${comment.new_value}` : "",
    ]
      .filter(Boolean)
      .join(" → ") || comment.comment,
    actor: `User ${comment.user_id}`,
    timestamp: comment.created_at,
  };
}

function toBackendPayload(form: TaskFormState): BackendTaskCreate {
  const resolvedForm = resolveTaskFormTemplate(form);
  const numericTemplateId = Number(resolvedForm.formTemplateId);
  const isBackendTemplate = isValidBackendFormTemplateId(numericTemplateId);
  const trimmedTemplateId = resolvedForm.formTemplateId.trim();

  return {
    title: resolvedForm.title.trim(),
    description: resolvedForm.description.trim() || null,
    assigned_to: resolvedForm.assignedToId ?? null,
    priority: toBackendPriority(resolvedForm.priority),
    due_date:
      resolvedForm.recurrence === "once" && resolvedForm.due
        ? new Date(resolvedForm.due).toISOString()
        : null,
    source_type: isBackendTemplate
      ? "form_template"
      : trimmedTemplateId
        ? `${LOCAL_FORM_TEMPLATE_PREFIX}${trimmedTemplateId}`
        : null,
    source_id: isBackendTemplate ? numericTemplateId : null,
  };
}

export function resolveTaskFormTemplate(
  form: TaskFormState,
  activeTemplateIds: string[] = []
): TaskFormState {
  if (isValidBackendFormTemplateId(Number(form.formTemplateId))) {
    return form;
  }

  const fallbackId = activeTemplateIds.find((id) => isValidBackendFormTemplateId(Number(id)));
  if (!fallbackId) {
    return form;
  }

  return {
    ...form,
    formTemplateId: fallbackId,
  };
}

export function hasValidTaskFormTemplate(formTemplateId?: string) {
  return isValidBackendFormTemplateId(Number(formTemplateId));
}

export const taskService = {
  async listOutletMembers(outletId: string) {
    return api<OutletMember[]>("/api/v1/tasks/outlet-members", {
      headers: { "X-Outlet-Id": outletId },
    });
  },

  async listAssignments(taskId: string) {
    return api<TaskAssignmentResponse[]>(`/api/v1/tasks/${taskId}/assignments`);
  },

  async assignUser(taskId: string, user: OutletMember) {
    return api<TaskAssignmentResponse>(`/api/v1/tasks/${taskId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, role: "assignee" }),
    });
  },

  async removeAssignment(taskId: string, assignmentId: number) {
    return api<void>(`/api/v1/tasks/${taskId}/assignments/${assignmentId}`, {
      method: "DELETE",
    });
  },

  async bulkAssign(taskIds: string[], userId: number) {
    return api<{ assigned: number }>("/api/v1/tasks/bulk-assign", {
      method: "POST",
      body: JSON.stringify({ task_ids: taskIds.map(Number), user_id: userId }),
    });
  },

  async bulkDelete(taskIds: string[]) {
    return api<{ deleted: number }>("/api/v1/tasks/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ task_ids: taskIds.map(Number) }),
    });
  },

  async list(sourceType?: string) {
    try {
      const query = sourceType ? `?source_type=${encodeURIComponent(sourceType)}` : "";
      const tasks = await api<BackendTask[]>(`/api/v1/tasks${query}`);
      const mapped = tasks.map(mapBackendTask);
      if (!sourceType) {
        await cacheTasks(mapped);
      }
      return mapped;
    } catch (error) {
      if (!sourceType) {
        const cached = await getCachedTasks();

        if (cached.length > 0) {
          return cached;
        }
      }

      throw error;
    }
  },

  listAll() {
    return taskService.list();
  },

  async getBackendTask(taskId: string) {
    return api<BackendTask>(`/api/v1/tasks/${taskId}`);
  },

  async listCorrectiveActions() {
    return taskService.list("corrective_action");
  },

  async listFieldAudits() {
    return taskService.list("field_audit");
  },

  async createFieldAudit(input: {
    title: string;
    outletId: string;
    formTemplateId: string;
    description?: string;
    priority?: TaskPriority;
  }) {
    const numericTemplateId = Number(input.formTemplateId);
    if (!isValidBackendFormTemplateId(numericTemplateId)) {
      throw new Error("Template audit tidak valid. Publish form kategori Audit di menu Forms.");
    }

    const task = await api<BackendTask>("/api/v1/tasks", {
      method: "POST",
      headers: { "X-Outlet-Id": input.outletId },
      body: JSON.stringify({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        assigned_to: null,
        priority: toBackendPriority(input.priority ?? "High"),
        due_date: new Date().toISOString(),
        source_type: "field_audit",
        source_id: numericTemplateId,
      }),
    });

    return mapBackendTask(task);
  },

  async create(form: TaskFormState) {
    if (form.recurrence !== "once") {
      throw new Error(
        "Recurring SOP harus dibuat dari menu Schedules, bukan Tasks."
      );
    }

    const payload = toBackendPayload(form);
    const task = await api<BackendTask>("/api/v1/tasks", {
      method: "POST",
      headers: form.outletId ? { "X-Outlet-Id": form.outletId } : undefined,
      body: JSON.stringify(payload),
    });

    return mapBackendTask(task);
  },

  async update(taskId: string, form: TaskFormState) {
    const payload: BackendTaskUpdate = toBackendPayload(form);
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        assigned_to: payload.assigned_to,
        priority: payload.priority,
        due_date: payload.due_date,
        source_type: payload.source_type,
        source_id: payload.source_id,
      }),
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

  async remove(taskId: string, options?: { resolveOutletFromTask?: boolean }) {
    const headers: Record<string, string> = {};

    if (options?.resolveOutletFromTask) {
      headers["X-Outlet-Id"] = "";
    }

    return api<void>(`/api/v1/tasks/${taskId}`, {
      method: "DELETE",
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  },

  async review(taskId: string, review: "approved" | "rejected", note?: string) {
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ review, note: note ?? null }),
    });
    return mapBackendTask(task);
  },

  async verify(taskId: string) {
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}/verify`, {
      method: "POST",
    });
    return mapBackendTask(task);
  },

  async updateCorrectiveActionEvidence(
    taskId: string,
    payload: {
      root_cause?: string | null;
      before_evidence_url?: string | null;
      after_evidence_url?: string | null;
      note?: string | null;
    }
  ) {
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}/capa`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return mapBackendTask(task);
  },

  async rejectCorrectiveAction(taskId: string, reason: string) {
    const task = await api<BackendTask>(`/api/v1/tasks/${taskId}/reject-capa`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return mapBackendTask(task);
  },

  async submitExecution(
    taskId: string,
    payload: {
      form_template_id?: number | null;
      answers_json: Record<string, unknown>;
      latitude?: number | null;
      longitude?: number | null;
      accuracy_m?: number | null;
    }
  ) {
    const response = await api<{
      task: BackendTask;
      checklist: Record<string, unknown> | null;
      corrective_task: BackendTask | null;
    }>(`/api/v1/tasks/${taskId}/submit-execution`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      task: mapBackendTask(response.task),
      checklist: response.checklist,
      correctiveTask: response.corrective_task ? mapBackendTask(response.corrective_task) : null,
    };
  },
};
