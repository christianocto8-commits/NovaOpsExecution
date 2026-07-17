import { api } from "@/services/api";

export type TaskDraftStatus = "draft" | "published" | "archived";

export type TaskDraft = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  status: TaskDraftStatus;
  created_at: string;
  updated_at: string;
};

export type CreateTaskDraftPayload = {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
};

export type UpdateTaskDraftPayload = Partial<CreateTaskDraftPayload>;

export async function getTaskDrafts() {
  return api<TaskDraft[]>("/api/v1/task-drafts", {
    method: "GET",
  });
}

export async function createTaskDraft(payload: CreateTaskDraftPayload) {
  return api<TaskDraft>("/api/v1/task-drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTaskDraft(draftId: number, payload: UpdateTaskDraftPayload) {
  return api<TaskDraft>(`/api/v1/task-drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTaskDraft(draftId: number) {
  return api<void>(`/api/v1/task-drafts/${draftId}`, {
    method: "DELETE",
  });
}

export async function publishTaskDraft(draftId: number) {
  return api<TaskDraft>(`/api/v1/task-drafts/${draftId}/publish`, {
    method: "POST",
  });
}
