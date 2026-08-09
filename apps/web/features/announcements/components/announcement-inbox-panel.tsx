"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { useMemo, useState } from "react";

import { queryKeys } from "@/lib/query/keys";
import { announcementService, type Announcement } from "@/services/announcement.service";
import { useLanguage } from "@/shared/i18n";

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

function formatTimestamp(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AnnouncementInboxPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: announcementService.listActive,
    refetchInterval: 30_000,
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

  const announcements = listQuery.data ?? [];
  const unreadCount = useMemo(
    () => announcements.filter(isUnreadAnnouncement).length,
    [announcements]
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#274733]">{t("navigation.announcements")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? t("announcements.inbox.unread").replace("{count}", String(unreadCount))
              : t("announcements.inbox.allRead")}
          </p>
        </div>
        <Megaphone className="size-5 text-[#3D6B49]" />
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-slate-500">{t("announcements.inbox.loading")}</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-slate-500">{t("announcements.inbox.empty")}</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => {
            const unread = isUnreadAnnouncement(item);
            const expanded = expandedId === item.id;

            return (
              <article
                key={item.id}
                className={[
                  "rounded-2xl border p-4",
                  priorityStyles[item.priority] ?? priorityStyles.normal,
                  unread ? "border-l-4 border-l-purple-600" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(expanded ? null : item.id);
                    if (unread) {
                      void announcementService.markRead(item.id).then(() => {
                        queryClient.invalidateQueries({
                          queryKey: queryKeys.announcements.active(),
                        });
                        queryClient.invalidateQueries({
                          queryKey: queryKeys.announcements.unreadCount(),
                        });
                      });
                    }
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    {unread ? (
                      <span className="shrink-0 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Baru
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatTimestamp(item.published_at ?? item.created_at)} · {item.priority}
                  </p>
                  {!expanded ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.body}</p>
                  ) : null}
                </button>

                {expanded ? (
                  <div className="mt-3 border-t border-slate-200/70 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {item.body}
                    </p>
                    {item.requires_acknowledgment && !item.is_acknowledged ? (
                      <button
                        type="button"
                        disabled={acknowledgeMutation.isPending}
                        onClick={() => acknowledgeMutation.mutate(item)}
                        className="mt-4 rounded-full bg-[#274733] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {t("announcement.acknowledge")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
