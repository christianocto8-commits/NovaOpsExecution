export type DraftStatus = "draft" | "ready" | "published" | "archived";

export type DraftTask = {
  id: string;
  title: string;
  description?: string | null;
  status: DraftStatus;
  priority?: string | null;
  due_date?: string | null;
  outlet_id?: string | null;
  created_at: string;
  updated_at: string;
};
