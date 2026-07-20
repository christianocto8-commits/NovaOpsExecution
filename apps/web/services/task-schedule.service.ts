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
  auto_publish: boolean;
  is_active: boolean;
  created_by: number;
  last_published_at: string | null;
  next_publish_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateTaskSchedulePayload = {
  title: string;
  description: string | null;
  form_template_id: number | null;
  priority: string;
  recurrence: "daily" | "weekly";
  shifts: TaskShift[];
  outlet_ids: string[];
  due_time: string;
  weekly_publish_day: TaskWeeklyPublishDay | null;
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

function toSchedulePayload(form: TaskFormState): CreateTaskSchedulePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    form_template_id: resolveFormTemplateId(form.formTemplateId),
    priority: toBackendPriority(form.priority),
    recurrence: form.recurrence === "weekly" ? "weekly" : "daily",
    shifts: form.recurrence === "weekly" ? [] : form.shifts,
    outlet_ids: resolveOutletIds(form),
    due_time: form.dueTime || "09:00",
    weekly_publish_day: form.recurrence === "weekly" ? form.weeklyPublishDay : null,
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

  return {
    title: schedule.title,
    outlet: targetOutlets[0] ?? "",
    outletId: schedule.outlet_ids_json[0],
    status: "Pending",
    priority: fromBackendPriority(schedule.priority),
    assignee: "Outlet Team",
    due: "",
    description: schedule.description ?? "",
    formTemplateId: schedule.form_template_id ? String(schedule.form_template_id) : "",
    recurrence: schedule.recurrence === "weekly" ? "weekly" : "daily",
    shifts: schedule.shifts_json.length > 0 ? schedule.shifts_json : ["morning"],
    targetOutlets,
    targetOutletIds: schedule.outlet_ids_json,
    autoPublish: schedule.auto_publish,
    dueTime: schedule.due_time,
    weeklyPublishDay: schedule.weekly_publish_day ?? "sunday",
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
