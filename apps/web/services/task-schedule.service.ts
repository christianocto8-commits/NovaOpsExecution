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

function toBackendPriority(priority: TaskFormState["priority"]) {
  if (priority === "Critical") return "urgent";
  if (priority === "High") return "high";
  if (priority === "Low") return "low";
  return "medium";
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

function toSchedulePayload(form: TaskFormState): CreateTaskSchedulePayload {
  const numericTemplateId = Number(form.formTemplateId);

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    form_template_id: Number.isFinite(numericTemplateId) ? numericTemplateId : null,
    priority: toBackendPriority(form.priority),
    recurrence: form.recurrence === "weekly" ? "weekly" : "daily",
    shifts: form.recurrence === "weekly" ? [] : form.shifts,
    outlet_ids: resolveOutletIds(form),
    due_time: form.dueTime || "09:00",
    weekly_publish_day: form.recurrence === "weekly" ? form.weeklyPublishDay : null,
    auto_publish: form.autoPublish,
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
