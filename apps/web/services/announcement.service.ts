import { api } from "@/services/api";

export type AnnouncementPriority = "normal" | "high" | "urgent";
export type AnnouncementTargetScope = "all" | "region" | "district" | "outlet";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  target_scope: AnnouncementTargetScope;
  target_ids: string[];
  requires_acknowledgment: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  is_acknowledged?: boolean;
  read_at?: string | null;
  acknowledged_at?: string | null;
};

export type AnnouncementCreatePayload = {
  title: string;
  body: string;
  priority?: AnnouncementPriority;
  target_scope?: AnnouncementTargetScope;
  target_ids?: string[];
  requires_acknowledgment?: boolean;
  expires_at?: string | null;
};

export type AnnouncementUpdatePayload = Partial<AnnouncementCreatePayload>;

export const announcementService = {
  listAll() {
    return api<Announcement[]>("/api/v1/announcements");
  },

  listActive() {
    return api<Announcement[]>("/api/v1/announcements/active");
  },

  getUnreadCount() {
    return api<{ unread_count: number }>("/api/v1/announcements/unread-count");
  },

  create(payload: AnnouncementCreatePayload) {
    return api<Announcement>("/api/v1/announcements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: AnnouncementUpdatePayload) {
    return api<Announcement>(`/api/v1/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string) {
    return api<void>(`/api/v1/announcements/${id}`, { method: "DELETE" });
  },

  publish(id: string) {
    return api<Announcement>(`/api/v1/announcements/${id}/publish`, { method: "POST" });
  },

  markRead(id: string) {
    return api<{ message: string; announcement_id: string; read_at: string | null }>(
      `/api/v1/announcements/${id}/read`,
      { method: "POST" }
    );
  },

  acknowledge(id: string) {
    return api<{ message: string; announcement_id: string; acknowledged_at: string | null }>(
      `/api/v1/announcements/${id}/acknowledge`,
      { method: "POST" }
    );
  },
};
