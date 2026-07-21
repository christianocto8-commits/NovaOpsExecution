"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react";

import { PwaInstallPrompt } from "@/features/pwa/components/pwa-install-prompt";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { AnnouncementBanner } from "@/features/announcements/components/announcement-banner";
import { FormLibraryPanel, rememberRecentTemplate } from "@/features/forms/components/form-library-panel";
import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
import type { Task } from "@/features/tasks/types";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { taskService } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import { QuickCrewSwitch } from "@/shared/navigation/components/quick-crew-switch";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

function isOpenTask(task: Task) {
  return task.status !== "Completed";
}

function isDueToday(task: Task) {
  if (!task.due) return false;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;
  const due = new Date(task.due);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

export default function OperatorHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { isOnline } = useOnlineStatus();
  const { pendingSyncCount } = useOfflineSync();

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
  });

  const tasks = useMemo(() => {
    const all = tasksQuery.data ?? [];
    if (workspace.mode !== "outlet") return all;

    return all.filter(
      (task) =>
        task.outletId === workspace.outletId ||
        task.outlet === workspace.outletName ||
        task.targetOutlets?.includes(workspace.outletName ?? "")
    );
  }, [tasksQuery.data, workspace]);

  const openTasks = tasks.filter(isOpenTask);
  const todayTasks = openTasks.filter(isDueToday);
  const overdueTasks = openTasks.filter(isOverdue);
  const completedToday = tasks.filter(
    (task) => task.status === "Completed" && isDueToday(task)
  ).length;

  return (
    <main className="space-y-6 p-4 pb-[max(6rem,env(safe-area-inset-bottom))] sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          {t("operator.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          {workspace.outletName ?? t("operator.defaultTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("operator.subtitle")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
              isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isOnline ? t("operator.online") : t("operator.offline")}
          </span>
          {pendingSyncCount > 0 ? (
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {t("operator.pendingSync", { count: pendingSyncCount })}
            </span>
          ) : null}
        </div>
      </div>

      <PwaInstallPrompt />
      <PushNotificationPrompt />
      <QuickCrewSwitch outletName={workspace.outletName} />
      <AnnouncementBanner />

      <FormLibraryPanel
        compact
        onSelectTemplate={(template) => {
          rememberRecentTemplate(template.id);
          router.push(`/dashboard/forms?templateId=${template.id}`);
        }}
      />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 sm:p-5">
          <AlertCircle className="size-6 text-red-600" />
          <p className="mt-3 text-2xl font-bold text-red-700 sm:text-3xl">{overdueTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            {t("operator.overdue")}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:p-5">
          <Clock3 className="size-6 text-amber-600" />
          <p className="mt-3 text-2xl font-bold text-amber-700 sm:text-3xl">{todayTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {t("operator.dueToday")}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
          <CheckCircle2 className="size-6 text-emerald-600" />
          <p className="mt-3 text-2xl font-bold text-emerald-700 sm:text-3xl">{completedToday}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {t("operator.doneToday")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <ClipboardCheck className="size-6 text-slate-600" />
          <p className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{openTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("operator.open")}
          </p>
        </div>
      </section>

      {overdueTasks.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-sm font-bold text-red-800">{t("operator.needsAttention")}</p>
          <ul className="mt-3 space-y-3">
            {overdueTasks.slice(0, 3).map((task) => (
              <li key={task.id}>
                <Link
                  href={`/dashboard/tasks?taskId=${task.id}`}
                  className="block rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm font-semibold text-slate-800 active:bg-red-100"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ActivityFeed compact limit={5} title={t("activity.recentTitle")} />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Link
          href="/dashboard/tasks"
          className="flex min-h-[52px] items-center justify-between rounded-2xl bg-emerald-700 px-5 py-4 text-white shadow-sm active:bg-emerald-800"
        >
          <div>
            <p className="text-base font-bold">{t("operator.startTasks")}</p>
            <p className="text-xs text-emerald-100">
              {t("operator.tasksWaiting", { count: openTasks.length })}
            </p>
          </div>
          <ClipboardCheck className="size-7" />
        </Link>
      </div>
    </main>
  );
}
