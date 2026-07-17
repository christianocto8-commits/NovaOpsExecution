import { api } from "@/services/api";

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

export async function getDrafts(): Promise<DraftsResponse> {
  return api<DraftsResponse>("/drafts");
}

export async function publishDraft(id: string): Promise<DraftItem> {
  return api<DraftItem>(`/drafts/${id}/publish`, {
    method: "POST",
  });
}

export async function deleteDraft(id: string): Promise<{ id: string }> {
  return api<{ id: string }>(`/drafts/${id}`, {
    method: "DELETE",
  });
}
