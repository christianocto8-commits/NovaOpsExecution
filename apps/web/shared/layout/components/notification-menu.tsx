"use client";

import { useCallback, useMemo, useRef } from "react";
import { Bell, CheckCircle2, ClipboardCheck, FileText, MoreHorizontal, X } from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";
import { usePopup } from "@/shared/popup";

type NotificationType = "task" | "report" | "approval" | "system";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  unread: boolean;
};

const POPUP_ID = "notification-menu";

const notifications: Notification[] = [
  {
    id: "notif-001",
    type: "task",
    title: "Task overdue",
    description: "3 operational tasks need attention across KOV outlets.",
    time: "5 min ago",
    unread: true,
  },
  {
    id: "notif-002",
    type: "approval",
    title: "Draft ready for review",
    description: "Daily checklist draft was updated by Lead Barista.",
    time: "18 min ago",
    unread: true,
  },
  {
    id: "notif-003",
    type: "report",
    title: "Report generated",
    description: "Latest outlet performance report is ready.",
    time: "1 hour ago",
    unread: false,
  },
];

function getNotificationIcon(type: NotificationType) {
  if (type === "task") return ClipboardCheck;
  if (type === "report") return FileText;
  if (type === "approval") return CheckCircle2;
  return Bell;
}

export function NotificationMenu() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isPopupOpen, togglePopup, closePopup } = usePopup();

  const open = isPopupOpen(POPUP_ID);

  const closeMenu = useCallback(() => {
    closePopup(POPUP_ID);
  }, [closePopup]);

  useClickOutside(menuRef, closeMenu, { enabled: open });
  useEscapeKey(closeMenu, open);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => notification.unread).length;
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => togglePopup(POPUP_ID)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[380px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-slate-950">Notifications</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Operational updates and workflow alerts
              </div>
            </div>

            <button
              type="button"
              onClick={closeMenu}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={closeMenu}
                  className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-4 w-4" />

                    {notification.unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-slate-950">
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-slate-400">
                        {notification.time}
                      </span>
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {notification.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={closeMenu}
              className="text-xs font-bold text-emerald-700 transition hover:text-emerald-800"
            >
              Mark all as read
            </button>

            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-slate-900"
            >
              View all
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
