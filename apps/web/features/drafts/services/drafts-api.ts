import {
  deleteTaskDraft,
  getTaskDrafts,
  publishTaskDraft,
  type TaskDraft,
} from "@/services/draft.service";

export type DraftStatus = "draft" | "pending_review" | "published" | "archived";

export type DraftItem = {
  id: string;
  title: string;
  module: string;
  outlet: string;
  owner: string;
  status: DraftStatus;
  version: string;
  updatedAt: string;
  summary: string;
};

export type DraftsResponse = {
  items: DraftItem[];
};

function mapTaskDraft(draft: TaskDraft): DraftItem {
  const status: DraftStatus =
    draft.status === "published" ? "published" : draft.status === "archived" ? "archived" : "draft";

  return {
    id: String(draft.id),
    title: draft.title,
    module: "task",
    outlet: "-",
    owner: "-",
    status,
    version: "v1",
    updatedAt: draft.updated_at,
    summary: draft.description || draft.title,
  };
}

export async function getDrafts(): Promise<DraftsResponse> {
  const drafts = await getTaskDrafts();
  return { items: drafts.map(mapTaskDraft) };
}

export async function publishDraft(id: string): Promise<DraftItem> {
  const result = await publishTaskDraft(Number(id));
  return {
    id: String(result.draft_id),
    title: `Task #${result.task_id}`,
    module: "task",
    outlet: "-",
    owner: "-",
    status: "published",
    version: "v1",
    updatedAt: new Date().toISOString(),
    summary: result.message,
  };
}

export async function deleteDraft(id: string): Promise<{ id: string }> {
  await deleteTaskDraft(Number(id));
  return { id };
}
