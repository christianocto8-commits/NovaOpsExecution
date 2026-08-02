import {
  getTaskDrafts,
  publishTaskDraft,
  updateTaskDraft,
  type TaskDraft,
} from "@/services/draft.service";
import { DraftTask } from "./types";

function mapDraft(draft: TaskDraft): DraftTask {
  return {
    id: String(draft.id),
    title: draft.title,
    description: draft.description,
    status:
      draft.status === "published"
        ? "published"
        : draft.status === "archived"
          ? "archived"
          : "draft",
    priority: draft.priority,
    due_date: draft.due_date,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
  };
}

export async function getDrafts(): Promise<DraftTask[]> {
  const drafts = await getTaskDrafts();
  return drafts.map(mapDraft);
}

export async function getDraft(id: string): Promise<DraftTask> {
  const drafts = await getTaskDrafts();
  const draft = drafts.find((item) => String(item.id) === id);
  if (!draft) {
    throw new Error("Draft not found");
  }
  return mapDraft(draft);
}

export async function updateDraft(
  id: string,
  payload: Partial<Pick<DraftTask, "title" | "description" | "status" | "priority" | "due_date">>
): Promise<DraftTask> {
  const draft = await updateTaskDraft(Number(id), {
    title: payload.title,
    description: payload.description ?? undefined,
    priority: payload.priority ?? undefined,
    due_date: payload.due_date,
  });
  return mapDraft(draft);
}

export async function publishDraft(id: string): Promise<{ task_id: string }> {
  const result = await publishTaskDraft(Number(id));
  return { task_id: String(result.task_id) };
}
