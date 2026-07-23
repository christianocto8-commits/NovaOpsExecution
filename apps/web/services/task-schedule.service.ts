import { api } from "@/services/api";
import type { TaskFormState, TaskRecurrence, TaskShift, TaskWeeklyPublishDay } from "@/features/tasks/types";

export type BackendTaskSchedule = {
  id: number;
  title: string;
  description: string | null;
  form_template_id: number | null;
  priority: string;
  recurrence: TaskRecurrence;
  shifts_json: TaskShift[];
  outlet_ids_json: string[];
  due_time: string;
  weekly_publish_day: TaskWeeklyPublishDay | null;
  monthly_publish_day: number | null;
  assigned_to: number | null;
  auto_publish: boolean;
  is_active: boolean;
  created_by: number;
  last_published_at: string | null;
  next_publish_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BackendUpcomingTaskSchedule = {
  id: string;
  schedule_id: number;
  title: string;
  description: string | null;
  form_template_id: number | null;
  priority: string;
  recurrence: TaskRecurrence;
  shift: TaskShift | null;
  outlet_id: number;
  outlet_ref: string;
  publish_at: string;
  locked: boolean;
};

type CreateTaskSchedulePayload = {
  title: string;
  description: string | null;
  form_template_id: number | null;
  priority: string;
  recurrence: "daily" | "weekly" | "monthly";
  shifts: TaskShift[];
  outlet_ids: string[];
  due_time: string;
  weekly_publish_day: TaskWeeklyPublishDay | null;
  monthly_publish_day: number | null;
  assigned_to: number | null;
  auto_publish: boolean;
};

type UpdateTaskSchedulePayload = Partial<CreateTaskSchedulePayload> & {
  is_active?: boolean;
};

function toBackendPriority(priority: TaskFormState["priority"]) {
  if (priority === "Critical") return "urgent";
  if (priority === "High") return "high";
  if (priority === "Low") return "low";
  return "medium";
}

function fromBackendPriority(priority: string): TaskFormState["priority"] {
  if (priority === "urgent") return "Critical";
  if (priority === "high") return "High";
  if (priority === "low") return "Low";
  return "Medium";
}

function resolveOutletIds(form: TaskFormState) {
  if (form.targetOutletIds && form.targetOutletIds.length > 0) {
    return form.targetOutletIds;
  }

  if (form.outletId) {
    return [form.outletId];
  }

  return [];
}

function resolveFormTemplateId(formTemplateId: string): number | null {
  const trimmed = formTemplateId.trim();
  if (!trimmed) return null;

  const numericTemplateId = Number(trimmed);
  if (!Number.isFinite(numericTemplateId) || numericTemplateId <= 0) return null;

  return numericTemplateId;
}

function resolveRecurrence(form: TaskFormState): CreateTaskSchedulePayload["recurrence"] {
  if (form.recurrence === "weekly") return "weekly";
  if (form.recurrence === "monthly") return "monthly";
  return "daily";
}

function toSchedulePayload(form: TaskFormState): CreateTaskSchedulePayload {
  const recurrence = resolveRecurrence(form);

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    form_template_id: resolveFormTemplateId(form.formTemplateId),
    priority: toBackendPriority(form.priority),
    recurrence,
    shifts: recurrence === "daily" ? form.shifts : [],
    outlet_ids: resolveOutletIds(form),
    due_time: form.dueTime || "09:00",
    weekly_publish_day: recurrence === "weekly" ? form.weeklyPublishDay : null,
    monthly_publish_day: recurrence === "monthly" ? form.monthlyPublishDay || 1 : null,
    assigned_to: form.assignedToId ?? null,
    auto_publish: form.autoPublish,
  };
}

export function scheduleToFormState(
  schedule: BackendTaskSchedule,
  outletNameById: Record<string, string> = {}
): TaskFormState {
  const targetOutlets = schedule.outlet_ids_json.map(
    (outletId) => outletNameById[outletId] ?? outletId
  );

  const recurrence: TaskFormState["recurrence"] =
    schedule.recurrence === "weekly"
      ? "weekly"
      : schedule.recurrence === "monthly"
        ? "monthly"
        : "daily";

  const assigneeSelection =
    schedule.assigned_to != null
      ? (`user:${schedule.assigned_to}` as const)
      : "outlet_team";

  return {
    title: schedule.title,
    outlet: targetOutlets[0] ?? "",
    outletId: schedule.outlet_ids_json[0],
    status: "Pending",
    priority: fromBackendPriority(schedule.priority),
    assignee: schedule.assigned_to ? `User ${schedule.assigned_to}` : "Outlet Team",
    assignedToId: schedule.assigned_to,
    assigneeSelection,
    due: "",
    description: schedule.description ?? "",
    formTemplateId: schedule.form_template_id ? String(schedule.form_template_id) : "",
    recurrence,
    shifts: schedule.shifts_json.length > 0 ? schedule.shifts_json : ["morning"],
    targetOutlets,
    targetOutletIds: schedule.outlet_ids_json,
    autoPublish: schedule.auto_publish,
    dueTime: schedule.due_time,
    weeklyPublishDay: schedule.weekly_publish_day ?? "sunday",
    monthlyPublishDay: schedule.monthly_publish_day ?? 1,
  };
}

export const taskScheduleService = {
  async create(form: TaskFormState) {
    return api<BackendTaskSchedule>("/api/v1/task-schedules", {
      method: "POST",
      body: JSON.stringify(toSchedulePayload(form)),
    });
  },

  async list() {
    return api<BackendTaskSchedule[]>("/api/v1/task-schedules");
  },

  async listUpcoming() {
    return api<BackendUpcomingTaskSchedule[]>("/api/v1/task-schedules/upcoming");
  },

  async get(scheduleId: number) {
    return api<BackendTaskSchedule>(`/api/v1/task-schedules/${scheduleId}`);
  },

  async update(scheduleId: number, form: TaskFormState, isActive?: boolean) {
    const payload: UpdateTaskSchedulePayload = {
      ...toSchedulePayload(form),
    };

    if (typeof isActive === "boolean") {
      payload.is_active = isActive;
    }

    return api<BackendTaskSchedule>(`/api/v1/task-schedules/${scheduleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async setActive(scheduleId: number, isActive: boolean) {
    return api<BackendTaskSchedule>(`/api/v1/task-schedules/${scheduleId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async delete(scheduleId: number) {
    return api<void>(`/api/v1/task-schedules/${scheduleId}`, {
      method: "DELETE",
    });
  },

  async process() {
    return api<{
      schedules_checked: number;
      schedules_published: number;
      tasks_created: number;
      skipped_duplicates: number;
    }>("/api/v1/task-schedules/process", {
      method: "POST",
    });
  },
};
