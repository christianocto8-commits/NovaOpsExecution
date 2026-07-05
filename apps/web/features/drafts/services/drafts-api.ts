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

const fallbackDrafts: DraftsResponse = {
  items: [
    {
      id: "1",
      title: "Daily Opening Checklist",
      module: "Tasks",
      outlet: "KOV Montre",
      owner: "Admin NovaOps",
      status: "draft",
      version: "v1.2",
      updatedAt: "Today",
      summary:
        "Draft checklist untuk opening outlet, readiness bar, station setup, dan service preparation.",
    },
    {
      id: "2",
      title: "Cleanliness Audit Form",
      module: "Audit",
      outlet: "KOV Heritage",
      owner: "Ops Manager",
      status: "pending_review",
      version: "v2.0",
      updatedAt: "Yesterday",
      summary: "Form audit cleanliness area bar, kitchen, customer area, dan back office.",
    },
    {
      id: "3",
      title: "Inventory Control SOP",
      module: "SOP",
      outlet: "All Outlets",
      owner: "Inventory Lead",
      status: "published",
      version: "v3.1",
      updatedAt: "2 days ago",
      summary: "SOP kontrol stok, daily count, variance handling, dan approval workflow.",
    },
    {
      id: "4",
      title: "Customer Recovery Script",
      module: "Service",
      outlet: "KOV Sultan Agung",
      owner: "Training Team",
      status: "archived",
      version: "v1.0",
      updatedAt: "Last week",
      summary: "Draft lama untuk service recovery menggunakan LATTE model.",
    },
  ],
};

export async function getDrafts(): Promise<DraftsResponse> {
  try {
    return await api<DraftsResponse>("/drafts");
  } catch {
    return fallbackDrafts;
  }
}

export async function publishDraft(id: string): Promise<DraftItem> {
  try {
    return await api<DraftItem>(`/drafts/${id}/publish`, {
      method: "POST",
    });
  } catch {
    const draft = fallbackDrafts.items.find((item) => item.id === id);

    if (!draft) {
      throw new Error("Draft not found");
    }

    return {
      ...draft,
      status: "published",
      updatedAt: "Just now",
    };
  }
}

export async function deleteDraft(id: string): Promise<{ id: string }> {
  try {
    return await api<{ id: string }>(`/drafts/${id}`, {
      method: "DELETE",
    });
  } catch {
    return { id };
  }
}
