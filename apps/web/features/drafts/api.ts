import { api } from "@/services/api";
import { DraftTask } from "./types";

const DRAFTS_ENDPOINT = "/tasks/drafts";

export async function getDrafts(): Promise<DraftTask[]> {
  return api<DraftTask[]>(DRAFTS_ENDPOINT);
}

export async function getDraft(id: string): Promise<DraftTask> {
  return api<DraftTask>(`${DRAFTS_ENDPOINT}/${id}`);
}

export async function updateDraft(
  id: string,
  payload: Partial<
    Pick<
      DraftTask,
      "title" | "description" | "status" | "priority" | "due_date"
    >
  >
): Promise<DraftTask> {
  return api<DraftTask>(`${DRAFTS_ENDPOINT}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function publishDraft(id: string): Promise<{ task_id: string }> {
  return api<{ task_id: string }>(`${DRAFTS_ENDPOINT}/${id}/publish`, {
    method: "POST",
  });
}