"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { useMemo, useState } from "react";

import { queryKeys } from "@/lib/query/keys";
import { announcementService, type Announcement } from "@/services/announcement.service";
import { useLanguage } from "@/shared/i18n";

const priorityStyles: Record<string, string> = {
  normal: "border-[#DDE8E1] bg-[#F7FAF8]",
  high: "border-amber-200 bg-amber-50",
  urgent: "border-red-200 bg-red-50",
};

function AnnouncementModal({
  announcement,
  onClose,
  onAcknowledge,
  loading,
}: {
  announcement: Announcement;
  onClose: () => void;
  onAcknowledge: () => void;
  loading: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-[#3D6B49]" />
            <h3 className="text-lg font-bold text-[#274733]">{announcement.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {announcement.body}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onAcknowledge}
            className="rounded-full bg-[#274733] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {announcement.requires_acknowledgment
              ? t("announcement.acknowledge")
              : t("announcement.markRead")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementBanner() {
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [modalId, setModalId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: announcementService.listActive,
    refetchInterval: 30_000,
  });

  const unread = useMemo(() => {
    return (query.data ?? []).filter(
      (item) =>
        !item.is_read &&
        !dismissedIds.includes(item.id) &&
        (!item.requires_acknowledgment || !item.is_acknowledged)
    );
  }, [query.data, dismissedIds]);

  const current = unread[0] ?? null;
  const modalAnnouncement =
    modalId != null ? ((query.data ?? []).find((item) => item.id === modalId) ?? current) : current;

  const mutation = useMutation({
    mutationFn: async (announcement: Announcement) => {
      await announcementService.markRead(announcement.id);
      if (announcement.requires_acknowledgment) {
        await announcementService.acknowledge(announcement.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.unreadCount() });
      if (modalAnnouncement) {
        setDismissedIds((prev) => [...prev, modalAnnouncement.id]);
      }
      setModalId(null);
    },
  });

  if (!current) return null;

  return (
    <>
      <div
        className={`rounded-2xl border px-4 py-3 ${priorityStyles[current.priority] ?? priorityStyles.normal}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setModalId(current.id)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-[#274733]">
              <Megaphone className="size-4 shrink-0" />
              {current.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{current.body}</p>
          </button>
          <button
            type="button"
            onClick={() => setDismissedIds((prev) => [...prev, current.id])}
            className="rounded-full p-1 text-slate-400 hover:bg-white/70"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {modalAnnouncement ? (
        <AnnouncementModal
          announcement={modalAnnouncement}
          onClose={() => setModalId(null)}
          onAcknowledge={() => mutation.mutate(modalAnnouncement)}
          loading={mutation.isPending}
        />
      ) : null}
    </>
  );
}
