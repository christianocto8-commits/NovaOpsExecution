"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Megaphone, RefreshCw, X } from "lucide-react";

import { queryKeys } from "@/lib/query/keys";
import { announcementService, type Announcement } from "@/services/announcement.service";
import { useLanguage } from "@/shared/i18n";

type AnnouncementSlidePanelProps = {
  open: boolean;
  onClose: () => void;
};

type InboxFilter = "all" | "unread";

const priorityStyles: Record<string, string> = {
  normal: "border-[#DDE8E1] bg-[#F7FAF8]",
  high: "border-amber-200 bg-amber-50",
  urgent: "border-red-200 bg-red-50",
};

function isUnreadAnnouncement(item: Announcement) {
  if (item.is_read) return false;
  if (item.requires_acknowledgment && item.is_acknowledged) return false;
  return true;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "baru saja";
  if (diffMinutes < 60) return `${diffMinutes}m lalu`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;

  return formatDate(value);
}

function getDateGroupLabel(value?: string | null) {
  if (!value) return "Sebelumnya";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sebelumnya";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hari ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

function groupAnnouncementsByDate(announcements: Announcement[]) {
  const groups = new Map<string, Announcement[]>();

  announcements.forEach((announcement) => {
    const label = getDateGroupLabel(announcement.published_at ?? announcement.created_at);
    groups.set(label, [...(groups.get(label) ?? []), announcement]);
  });

  return Array.from(groups.entries());
}

function AnnouncementListRow({
  announcement,
  onSelect,
}: {
  announcement: Announcement;
  onSelect: () => void;
}) {
  const unread = isUnreadAnnouncement(announcement);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-white",
        priorityStyles[announcement.priority] ?? priorityStyles.normal,
        unread ? "border-l-4 border-l-purple-600" : "",
      ].join(" ")}
    >
      <Megaphone className="mt-0.5 size-4 shrink-0 text-[#3D6B49]" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-bold text-[#274733]">{announcement.title}</p>
          {unread ? (
            <span className="shrink-0 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Baru
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{announcement.body}</p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {formatRelativeTime(announcement.published_at ?? announcement.created_at)} ·{" "}
          {announcement.priority}
        </p>
      </div>

      <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
    </button>
  );
}

function AnnouncementDetailView({
  announcement,
  onBack,
  onAcknowledge,
  loading,
}: {
  announcement: Announcement;
  onBack: () => void;
  onAcknowledge: () => void;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const needsAck = announcement.requires_acknowledgment && !announcement.is_acknowledged;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#DDE8E1] px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#3D6B49] transition hover:text-[#274733]"
        >
          <ArrowLeft className="size-4" />
          {t("announcements.inbox.back")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-[#274733]">{announcement.title}</h3>
          <span className="shrink-0 rounded-full bg-[#EAF1EC] px-2.5 py-1 text-[11px] font-bold uppercase text-[#3D6B49]">
            {announcement.priority}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{announcement.body}</p>

        <dl className="mt-5 space-y-3 rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] p-4 text-sm">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="font-semibold text-slate-500">{t("announcements.inbox.publishedAt")}</dt>
            <dd className="text-slate-800">
              {formatDate(announcement.published_at ?? announcement.created_at)}
            </dd>
          </div>
          {announcement.requires_acknowledgment ? (
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-500">{t("announcements.inbox.acknowledgment")}</dt>
              <dd className="text-slate-800">
                {announcement.is_acknowledged
                  ? t("announcements.inbox.acknowledged")
                  : t("announcements.inbox.pendingAck")}
              </dd>
            </div>
          ) : null}
        </dl>

        {needsAck || !announcement.is_read ? (
          <button
            type="button"
            disabled={loading}
            onClick={onAcknowledge}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#274733] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3D6B49] disabled:opacity-60"
          >
            {announcement.requires_acknowledgment
              ? t("announcement.acknowledge")
              : t("announcement.markRead")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AnnouncementSlidePanel({ open, onClose }: AnnouncementSlidePanelProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [portalReady, setPortalReady] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: announcementService.listActive,
    enabled: open,
    retry: false,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (announcement: Announcement) => {
      await announcementService.markRead(announcement.id);
      if (announcement.requires_acknowledgment) {
        await announcementService.acknowledge(announcement.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.unreadCount() });
    },
  });

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const announcements = listQuery.data ?? [];

  const filteredAnnouncements = useMemo(() => {
    if (filter === "unread") {
      return announcements.filter(isUnreadAnnouncement);
    }

    return announcements;
  }, [announcements, filter]);

  const groupedAnnouncements = groupAnnouncementsByDate(filteredAnnouncements);
  const unreadCount = announcements.filter(isUnreadAnnouncement).length;
  const selectedAnnouncement = announcements.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setFilter("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
          return;
        }

        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, selectedId]);

  if (!portalReady) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("announcements.inbox.close")}
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("navigation.announcements")}
        className={`fixed flex flex-col overflow-hidden border-[#DDE8E1] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        } inset-x-0 bottom-0 h-[min(92dvh,100%)] max-h-[92dvh] rounded-t-3xl border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[min(100vw,28rem)] sm:rounded-none sm:border-l sm:border-t-0`}
      >
        {selectedAnnouncement ? (
          <AnnouncementDetailView
            announcement={selectedAnnouncement}
            onBack={() => setSelectedId(null)}
            onAcknowledge={() => acknowledgeMutation.mutate(selectedAnnouncement)}
            loading={acknowledgeMutation.isPending}
          />
        ) : (
          <>
            <div className="shrink-0 border-b border-[#DDE8E1] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF1EC] text-[#3D6B49]">
                    <Megaphone className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#274733]">{t("navigation.announcements")}</p>
                    <p className="text-xs text-slate-500">
                      {t("announcements.inbox.total").replace("{count}", String(announcements.length))}
                      {unreadCount > 0
                        ? ` · ${t("announcements.inbox.unread").replace("{count}", String(unreadCount))}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void listQuery.refetch()}
                    className="flex size-9 items-center justify-center rounded-full border border-[#DDE8E1] text-[#3D6B49] transition hover:bg-[#EAF1EC]"
                    title="Refresh"
                  >
                    <RefreshCw className={`size-4 ${listQuery.isLoading ? "animate-spin" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex size-9 items-center justify-center rounded-full border border-[#DDE8E1] text-slate-500 transition hover:bg-slate-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {(["all", "unread"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-bold transition",
                      filter === option
                        ? "bg-[#274733] text-white"
                        : "border border-[#DDE8E1] bg-[#F7FAF8] text-slate-600 hover:bg-white",
                    ].join(" ")}
                  >
                    {option === "all"
                      ? t("announcements.inbox.filterAll")
                      : t("announcements.inbox.filterUnread")}
                    {option === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {listQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8]"
                    />
                  ))}
                </div>
              ) : listQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {listQuery.error instanceof Error
                    ? listQuery.error.message
                    : t("announcements.inbox.loadError")}
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DDE8E1] bg-[#F7FAF8] px-4 py-10 text-center">
                  <Megaphone className="mx-auto size-8 text-[#3D6B49]" />
                  <p className="mt-3 text-sm font-semibold text-[#274733]">
                    {t("announcements.inbox.empty")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{t("announcements.inbox.emptyHint")}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedAnnouncements.map(([dateLabel, items]) => (
                    <div key={dateLabel}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {dateLabel}
                      </p>
                      <div className="space-y-2">
                        {items.map((announcement) => (
                          <AnnouncementListRow
                            key={announcement.id}
                            announcement={announcement}
                            onSelect={() => {
                              setSelectedId(announcement.id);
                              if (isUnreadAnnouncement(announcement)) {
                                void announcementService.markRead(announcement.id).then(() => {
                                  queryClient.invalidateQueries({
                                    queryKey: queryKeys.announcements.active(),
                                  });
                                  queryClient.invalidateQueries({
                                    queryKey: queryKeys.announcements.unreadCount(),
                                  });
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}
