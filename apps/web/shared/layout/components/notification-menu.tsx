"use client";

import { useState } from "react";

const notifications = [
  {
    title: "Task overdue",
    description: "3 operational tasks need attention.",
  },
  {
    title: "Draft saved",
    description: "A checklist draft was updated recently.",
  },
  {
    title: "Report generated",
    description: "Latest outlet report is ready.",
  },
];

export function NotificationMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        🔔
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-bold text-slate-900">Notifications</div>
            <div className="text-xs text-slate-500">Operational updates</div>
          </div>

          <div className="p-2">
            {notifications.map((notification) => (
              <div
                key={notification.title}
                className="rounded-xl px-3 py-3 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold text-slate-800">
                  {notification.title}
                </div>
                <div className="text-xs text-slate-500">
                  {notification.description}
                </div>
              </div>
            ))}
          </div>

          <button className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50">
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}