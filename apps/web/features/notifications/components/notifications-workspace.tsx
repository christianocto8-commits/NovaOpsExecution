"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, RefreshCw, Send } from "lucide-react";

import { useNotificationsWorkspace } from "@/features/notifications/hooks/use-notifications-workspace";
import { AnnouncementsPanel } from "@/features/announcements/components/announcements-panel";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import type { Task } from "@/features/tasks/types";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { NotificationDelivery } from "@/features/workflows/types";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
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

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;

  const dueDate = new Date(task.due);
  if (Number.isNaN(dueDate.getTime())) return false;

  return dueDate.getTime() < Date.now();
}

function getOperationalAlerts(tasks: Task[]) {
  return tasks
    .filter(
      (task) =>
        task.status !== "Completed" &&
        (isOverdue(task) || task.priority === "Critical" || task.priority === "High")
    )
    .sort((first, second) => {
      const firstTime = first.due ? new Date(first.due).getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = second.due ? new Date(second.due).getTime() : Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime;
    });
}

function CrewNotificationCard({ notification }: { notification: NotificationDelivery }) {
  return (
    <article className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {notification.subject ?? "Notifikasi"}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {notification.body}
          </p>
          <p className="mt-2 text-xs text-slate-400">{formatDate(notification.created_at)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusTone(
            notification.status
          )}`}
        >
          {notification.status === "sent" ? "Baru" : notification.status}
        </span>
      </div>
    </article>
  );
}

function ManagerNotificationCard({ notification }: { notification: NotificationDelivery }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-700" />
            <p className="truncate font-bold text-slate-950">
              {notification.subject ?? "NovaOps Notification"}
            </p>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {notification.body}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusTone(
            notification.status
          )}`}
        >
          {notification.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-3">
        <div>
          <p className="font-bold uppercase tracking-wide text-slate-400">Channel</p>
          <p className="mt-1">{notification.channel}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wide text-slate-400">Created</p>
          <p className="mt-1">{formatDate(notification.created_at)}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wide text-slate-400">Sent</p>
          <p className="mt-1">{formatDate(notification.sent_at)}</p>
        </div>
      </div>
      {notification.last_error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {notification.last_error}
        </div>
      ) : null}
    </article>
  );
}

export function NotificationsWorkspace() {
  const workspace = useNotificationsWorkspace();
  const navigationWorkspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { hasRole } = useAuth();
  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });

  const isOutletWorkspace = navigationWorkspace.mode === "outlet";
  const isOwnerAdminWorkspace = navigationWorkspace.mode === "enterprise";
  const isAreaWorkspace = navigationWorkspace.mode === "area";
  const canProcessNotifications = isOwnerAdminWorkspace && !hasRole("outlet");

  const scopedTasks = useMemo(
    () => filterTasksForWorkspace(tasksQuery.data ?? [], navigationWorkspace),
    [navigationWorkspace, tasksQuery.data]
  );
  const operationalAlerts = useMemo(() => getOperationalAlerts(scopedTasks), [scopedTasks]);

  async function processPending() {
    try {
      const result = await workspace.processPending();
      window.alert(JSON.stringify(result, null, 2));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to process notifications.");
    }
  }

  if (isOutletWorkspace) {
    return (
      <main className={mobileDashboardMainClass}>
        <div>
          <p className="text-sm font-medium text-emerald-700">Notifikasi</p>
          <h1 className="text-2xl font-semibold text-slate-950">Kotak Masuk</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pengingat task, CAPA, dan update kerja untuk outlet Anda.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void workspace.refetch();
              void tasksQuery.refetch();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          {operationalAlerts.length > 0 ? (
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900"
            >
              <AlertTriangle className="size-4" />
              {operationalAlerts.length} perlu perhatian
            </Link>
          ) : null}
        </div>

        {workspace.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {workspace.error instanceof Error
              ? workspace.error.message
              : "Gagal memuat notifikasi."}
          </div>
        ) : null}

        {workspace.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Memuat notifikasi...
          </div>
        ) : workspace.notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <Bell className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">Belum ada notifikasi</p>
            <p className="mt-1 text-sm text-slate-500">
              Pengingat task dan update kerja akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workspace.notifications.map((notification) => (
              <CrewNotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Notifications</p>
          <h1 className="text-2xl font-semibold text-slate-950">Inbox</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isAreaWorkspace
              ? "Pantau notifikasi dan alert operasional outlet Anda."
              : "Review notifikasi operasional dan alert task."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void workspace.refetch();
              void tasksQuery.refetch();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {canProcessNotifications ? (
            <button
              type="button"
              onClick={() => void processPending()}
              disabled={workspace.isProcessing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {workspace.isProcessing ? "Processing..." : "Process Pending"}
            </button>
          ) : null}
        </div>
      </div>

      {workspace.isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-700">Notification API error</p>
          <p className="mt-1 text-sm text-red-600">
            {workspace.error instanceof Error
              ? workspace.error.message
              : "Unable to load notifications."}
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Inbox</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {workspace.notifications.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Alerts</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{operationalAlerts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {operationalAlerts.length > 0 ? "Perlu perhatian" : "Aman"}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Operational Alerts</p>
          <p className="mt-1 text-sm text-slate-500">
            Task overdue atau prioritas tinggi yang perlu ditindaklanjuti.
          </p>
        </div>

        {tasksQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading task alerts...
          </div>
        ) : operationalAlerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 font-bold text-slate-800">No task alerts right now</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {operationalAlerts.slice(0, 8).map((task) => (
              <article
                key={task.id}
                className="rounded-3xl border border-amber-200 bg-amber-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <p className="font-bold text-slate-950">{task.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {task.outlet} · {task.due || "No due date"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800">
                    {isOverdue(task) ? "Overdue" : task.priority}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {workspace.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading notifications...
        </div>
      ) : workspace.notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-bold text-slate-800">No notifications found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workspace.notifications.map((notification) => (
            <ManagerNotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      {isOwnerAdminWorkspace ? <AnnouncementsPanel /> : null}
    </main>
  );
}
