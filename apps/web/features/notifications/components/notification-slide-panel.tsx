"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, ExternalLink, RefreshCw, X } from "lucide-react";

import { useNotificationsWorkspace } from "@/features/notifications/hooks/use-notifications-workspace";
import type { NotificationDelivery } from "@/features/workflows/types";
import { useLanguage } from "@/shared/i18n";

type NotificationSlidePanelProps = {
  open: boolean;
  onClose: () => void;
};

type InboxFilter = "all" | "unread";

function isUnreadNotification(notification: NotificationDelivery) {
  return (
    !notification.read_at && notification.status !== "cancelled" && notification.status !== "failed"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
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

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(value);
}

function getDateGroupLabel(value?: string | null) {
  if (!value) return "Earlier";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

function groupNotificationsByDate(notifications: NotificationDelivery[]) {
  const groups = new Map<string, NotificationDelivery[]>();

  notifications.forEach((notification) => {
    const label = getDateGroupLabel(notification.created_at);
    groups.set(label, [...(groups.get(label) ?? []), notification]);
  });

  return Array.from(groups.entries());
}

function getActionIcon(channel: string) {
  if (channel.includes("email")) return "✉";
  if (channel.includes("push") || channel.includes("web")) return "🔔";
  if (channel.includes("sms")) return "💬";
  return "•";
}

function getStatusTone(status: string) {
  switch (status) {
    case "sent":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-rose-50 text-rose-700";
    case "processing":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function NotificationListRow({
  notification,
  onSelect,
}: {
  notification: NotificationDelivery;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-white"
    >
      <span className="mt-0.5 text-base" aria-hidden>
        {getActionIcon(notification.channel)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-bold text-[#274733]">
            {notification.subject ?? "NovaOps Notification"}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusTone(
              notification.status
            )}`}
          >
            {notification.status}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.body}</p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {formatRelativeTime(notification.created_at)} · {notification.channel}
        </p>
      </div>

      <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
    </button>
  );
}

function NotificationDetailView({
  notification,
  onBack,
  onNavigate,
}: {
  notification: NotificationDelivery;
  onBack: () => void;
  onNavigate?: () => void;
}) {
  const { t } = useLanguage();
  const href = notification.action_url ?? "/dashboard/notifications";
  const isActionable = Boolean(notification.action_url);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#DDE8E1] px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#3D6B49] transition hover:text-[#274733]"
        >
          <ArrowLeft className="size-4" />
          {t("notifications.inbox.back")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-[#274733]">
            {notification.subject ?? "NovaOps Notification"}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusTone(
              notification.status
            )}`}
          >
            {notification.status}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {notification.body}
        </p>

        <dl className="mt-5 space-y-3 rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] p-4 text-sm">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="font-semibold text-slate-500">{t("notifications.inbox.channel")}</dt>
            <dd className="text-slate-800">{notification.channel}</dd>
          </div>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="font-semibold text-slate-500">{t("notifications.inbox.createdAt")}</dt>
            <dd className="text-slate-800">{formatDate(notification.created_at)}</dd>
          </div>
          {notification.sent_at ? (
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-500">{t("notifications.inbox.sentAt")}</dt>
              <dd className="text-slate-800">{formatDate(notification.sent_at)}</dd>
            </div>
          ) : null}
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <dt className="font-semibold text-slate-500">{t("notifications.inbox.attempts")}</dt>
            <dd className="text-slate-800">{notification.attempt_count}</dd>
          </div>
        </dl>

        {notification.last_error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">{t("notifications.inbox.error")}</p>
            <p className="mt-1">{notification.last_error}</p>
          </div>
        ) : null}

        {isActionable ? (
          <Link
            href={href}
            onClick={onNavigate}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            {t("notifications.inbox.openAction")}
            <ExternalLink className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function NotificationSlidePanel({ open, onClose }: NotificationSlidePanelProps) {
  const { t } = useLanguage();
  const workspace = useNotificationsWorkspace();
  const { markRead } = workspace;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return workspace.notifications.filter(isUnreadNotification);
    }

    return workspace.notifications;
  }, [filter, workspace.notifications]);

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const unreadCount = workspace.notifications.filter(isUnreadNotification).length;
  const selectedNotification =
    workspace.notifications.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setFilter("all");
      return;
    }

    void markRead(undefined);
  }, [open, markRead]);

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
        aria-label={t("notifications.inbox.close")}
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("navigation.notifications")}
        className={`fixed flex flex-col overflow-hidden border-[#DDE8E1] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        } inset-x-0 bottom-0 h-[min(92dvh,100%)] max-h-[92dvh] rounded-t-3xl border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[min(100vw,28rem)] sm:rounded-none sm:border-l sm:border-t-0`}
      >
        {selectedNotification ? (
          <NotificationDetailView
            notification={selectedNotification}
            onBack={() => setSelectedId(null)}
            onNavigate={onClose}
          />
        ) : (
          <>
            <div className="shrink-0 border-b border-[#DDE8E1] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF1EC] text-[#3D6B49]">
                    <Bell className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#274733]">
                      {t("navigation.notifications")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("notifications.inbox.total").replace(
                        "{count}",
                        String(workspace.notifications.length)
                      )}
                      {unreadCount > 0
                        ? ` · ${t("notifications.inbox.pending").replace("{count}", String(unreadCount))}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void workspace.refetch()}
                    className="flex size-9 items-center justify-center rounded-full border border-[#DDE8E1] text-[#3D6B49] transition hover:bg-[#EAF1EC]"
                    title="Refresh"
                  >
                    <RefreshCw className={`size-4 ${workspace.isLoading ? "animate-spin" : ""}`} />
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
                      ? t("notifications.inbox.filterAll")
                      : t("notifications.inbox.filterPending")}
                    {option === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {workspace.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8]"
                    />
                  ))}
                </div>
              ) : workspace.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {workspace.error instanceof Error
                    ? workspace.error.message
                    : t("notifications.inbox.loadError")}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DDE8E1] bg-[#F7FAF8] px-4 py-10 text-center">
                  <Bell className="mx-auto size-8 text-[#3D6B49]" />
                  <p className="mt-3 text-sm font-semibold text-[#274733]">
                    {t("notifications.inbox.empty")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("notifications.inbox.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedNotifications.map(([dateLabel, items]) => (
                    <div key={dateLabel}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {dateLabel}
                      </p>
                      <div className="space-y-2">
                        {items.map((notification) => (
                          <NotificationListRow
                            key={notification.id}
                            notification={notification}
                            onSelect={() => {
                              void markRead([notification.id]);
                              setSelectedId(notification.id);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#DDE8E1] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
              <Link
                href="/dashboard/notifications"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-2xl bg-[#274733] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1F3A2A]"
              >
                {t("notifications.inbox.viewAll")}
              </Link>
            </div>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}

export function getNotificationBadgeCount(notifications: NotificationDelivery[]) {
  return notifications.filter(isUnreadNotification).length;
}
