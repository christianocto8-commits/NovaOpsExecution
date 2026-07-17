"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, RefreshCw, X } from "lucide-react";

import { useNotificationsWorkspace } from "@/features/notifications/hooks/use-notifications-workspace";
import type { NotificationDelivery } from "@/features/workflows/types";
import { useLanguage } from "@/shared/i18n";

type NotificationSlidePanelProps = {
  open: boolean;
  onClose: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function NotificationItem({ notification }: { notification: NotificationDelivery }) {
  return (
    <article className="rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#274733]">
            {notification.subject ?? "NovaOps Notification"}
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{notification.body}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusTone(
            notification.status
          )}`}
        >
          {notification.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{notification.channel}</span>
        <span>•</span>
        <span>{formatDate(notification.created_at)}</span>
      </div>
    </article>
  );
}

export function NotificationSlidePanel({ open, onClose }: NotificationSlidePanelProps) {
  const { t } = useLanguage();
  const workspace = useNotificationsWorkspace();
  const notifications = workspace.notifications.slice(0, 12);
  const pendingCount = workspace.notifications.filter(
    (item) => item.status === "pending" || item.status === "processing"
  ).length;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("navigation.notifications")}
        className={`absolute flex max-h-[88vh] flex-col overflow-hidden border-[#DDE8E1] bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-h-none sm:w-[min(100%,28rem)] ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        } inset-x-0 bottom-0 rounded-t-3xl border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:rounded-none sm:border-l sm:border-t-0`}
      >
        <div className="flex items-center justify-between border-b border-[#DDE8E1] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#EAF1EC] text-[#3D6B49]">
              <Bell className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#274733]">{t("navigation.notifications")}</p>
              <p className="text-xs text-slate-500">
                {workspace.notifications.length} total
                {pendingCount > 0 ? ` • ${pendingCount} pending` : ""}
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

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {workspace.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8]"
                />
              ))}
            </div>
          ) : workspace.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workspace.error instanceof Error
                ? workspace.error.message
                : "Unable to load notifications."}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DDE8E1] bg-[#F7FAF8] px-4 py-10 text-center">
              <Bell className="mx-auto size-8 text-[#3D6B49]" />
              <p className="mt-3 text-sm font-semibold text-[#274733]">No notifications yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Alerts from tasks and workflows will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#DDE8E1] px-4 py-4 sm:px-5">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-2xl bg-[#274733] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1F3A2A]"
          >
            View all notifications
          </Link>
        </div>
      </section>
    </div>
  );
}

export function getNotificationBadgeCount(notifications: NotificationDelivery[]) {
  return notifications.filter(
    (item) => item.status === "pending" || item.status === "processing"
  ).length;
}
