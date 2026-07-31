"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PlayCircle,
  RefreshCw,
} from "lucide-react";

import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { AnnouncementBanner } from "@/features/announcements/components/announcement-banner";
import {
  FormLibraryPanel,
  rememberRecentTemplate,
} from "@/features/forms/components/form-library-panel";
import { OfflineReadyCard } from "@/features/offline/components/offline-ready-card";
import { PwaInstallPrompt } from "@/features/pwa/components/pwa-install-prompt";
import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
import type { Task } from "@/features/tasks/types";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { taskService } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import { OperatorSectionTabs } from "@/shared/navigation/components/operator-section-tabs";
import { OfflineSyncBadge } from "@/shared/navigation/components/offline-sync-badge";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

import { isOpenTaskInInbox, isTaskCompleted } from "@/features/tasks/utils/task-inbox";

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

function isDueSoon(task: Task) {
  if (!task.due || task.status === "Completed") return false;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return false;
  const now = Date.now();
  return due.getTime() > now && due.getTime() <= now + 24 * 60 * 60 * 1000;
}

function getTaskProgressLabel(task: Task) {
  if (task.executionDraft) return "Draft";
  if (task.status === "Completed") return "100%";
  return null;
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
  const { pendingSyncCount, pendingTaskIds, workpackStats, isPrefetching, refreshWorkpack } =
    useOfflineSync();

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
  });

  const correctiveActionsQuery = useQuery({
    queryKey: [...queryKeys.sop.tasks(), "corrective-actions"],
    queryFn: () => taskService.listCorrectiveActions(),
    retry: false,
  });

  const tasks = useMemo(() => {
    const all = tasksQuery.data ?? [];
    if (workspace.mode !== "outlet") return all;

    return filterTasksForWorkspace(all, workspace);
  }, [tasksQuery.data, workspace]);

  const openTasks = tasks.filter(isOpenTaskInInbox);
  const todayTasks = openTasks.filter(isDueToday);
  const overdueTasks = openTasks.filter(isOverdue);
  const dueSoonTasks = openTasks.filter(isDueSoon);
  const draftTasks = openTasks.filter((task) => task.executionDraft);
  const completedToday = tasks.filter((task) => isTaskCompleted(task) && isDueToday(task)).length;
  const nextTask = [...todayTasks, ...dueSoonTasks, ...openTasks]
    .filter((task) => !isOverdue(task))
    .sort((first, second) => {
      const firstDue = first.due ? new Date(first.due).getTime() : Number.MAX_SAFE_INTEGER;
      const secondDue = second.due ? new Date(second.due).getTime() : Number.MAX_SAFE_INTEGER;
      return firstDue - secondDue;
    })[0];
  const todayTotal = todayTasks.length + completedToday;
  const todayCompletionRate = todayTotal > 0 ? Math.round((completedToday / todayTotal) * 100) : 0;
  const openCorrectiveActions = (correctiveActionsQuery.data ?? []).filter(
    (task) => (task.backendStatus ?? "open") !== "completed"
  );
  const isOfflineReady = isOnline && tasksQuery.isSuccess && tasks.length > 0;

  return (
    <>
      <OperatorSectionTabs />
      <main className={`${mobileDashboardMainClass} pb-24 sm:pb-6`}>
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                {t("operator.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                {workspace.outletName ?? t("operator.defaultTitle")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{t("operator.subtitle")}</p>
            </div>
            <OfflineSyncBadge />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void tasksQuery.refetch();
                void correctiveActionsQuery.refetch();
              }}
              disabled={tasksQuery.isFetching || correctiveActionsQuery.isFetching}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${tasksQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <PwaInstallPrompt compact />
            <span
              className={`inline-flex min-h-[36px] items-center rounded-full px-3 py-1.5 text-xs font-bold ${
                isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isOnline ? t("operator.online") : t("operator.offline")}
            </span>
            {pendingSyncCount > 0 ? (
              <span className="inline-flex min-h-[36px] items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {t("operator.pendingSync", { count: pendingSyncCount })}
              </span>
            ) : null}
            {workpackStats?.taskCount ? (
              <span className="inline-flex min-h-[36px] items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {t("operator.cachedTasksChip", { count: workpackStats.taskCount })}
              </span>
            ) : null}
            {isOfflineReady ? (
              <span className="inline-flex min-h-[36px] items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {t("operator.offlineReady")}
              </span>
            ) : null}
          </div>
        </div>

        {openCorrectiveActions.length > 0 ? (
          <Link
            href="/dashboard/corrective-actions"
            className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 active:bg-amber-100"
          >
            <span>
              {t("operator.openCorrectiveActions", { count: openCorrectiveActions.length })}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-700">CAPA →</span>
          </Link>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Today summary
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {todayCompletionRate}% completed
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {completedToday}/{todayTotal || 0} task hari ini selesai, {openTasks.length} masih
                open.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                overdueTasks.length > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "On track"}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${todayCompletionRate}%` }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {nextTask ? (
              <Link
                href={`/dashboard/tasks?taskId=${nextTask.id}`}
                className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 active:bg-emerald-100"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Next task
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">{nextTask.title}</p>
                </div>
                <PlayCircle className="size-6 shrink-0 text-emerald-700" />
              </Link>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Next task
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">Tidak ada task berikutnya.</p>
              </div>
            )}
            <Link
              href="/dashboard/drafts"
              className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 active:bg-blue-100"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Draft resume
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {draftTasks.length} draft tersimpan
                </p>
              </div>
              <ClipboardCheck className="size-6 shrink-0 text-blue-700" />
            </Link>
          </div>
        </section>

        <OfflineReadyCard
          stats={workpackStats}
          isPrefetching={isPrefetching}
          isOnline={isOnline}
          onRefresh={() => void refreshWorkpack()}
        />

        <PushNotificationPrompt />
        <AnnouncementBanner />

        <FormLibraryPanel
          compact
          onSelectTemplate={(template) => {
            rememberRecentTemplate(template.id);
            router.push(`/dashboard/forms?templateId=${template.id}`);
          }}
        />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 sm:p-5 min-h-[120px]">
            <AlertCircle className="size-6 text-red-600" />
            <p className="mt-3 text-2xl font-bold text-red-700 sm:text-3xl">
              {overdueTasks.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              {t("operator.overdue")}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:p-5 min-h-[120px]">
            <Clock3 className="size-6 text-amber-600" />
            <p className="mt-3 text-2xl font-bold text-amber-700 sm:text-3xl">
              {todayTasks.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              {t("operator.dueToday")}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5 min-h-[120px]">
            <CheckCircle2 className="size-6 text-emerald-600" />
            <p className="mt-3 text-2xl font-bold text-emerald-700 sm:text-3xl">{completedToday}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              {t("operator.doneToday")}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 min-h-[120px]">
            <ClipboardCheck className="size-6 text-slate-600" />
            <p className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{openTasks.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("operator.open")}
            </p>
          </div>
        </section>

        {dueSoonTasks.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm font-bold text-amber-900">{t("operator.dueSoon")}</p>
            <p className="mt-1 text-xs text-amber-800">
              {t("operator.dueSoonCount", { count: dueSoonTasks.length })}
            </p>
            <ul className="mt-3 space-y-2">
              {dueSoonTasks.slice(0, 3).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/dashboard/tasks?taskId=${task.id}`}
                    className="flex min-h-[52px] items-center justify-between rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 active:bg-amber-50"
                  >
                    <span className="truncate">{task.title}</span>
                    {getTaskProgressLabel(task) ? (
                      <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {getTaskProgressLabel(task)}
                      </span>
                    ) : null}
                    {pendingTaskIds.has(task.id) ? (
                      <span className="ml-2 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Sync
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {overdueTasks.length > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-white p-4">
            <p className="text-sm font-bold text-red-800">{t("operator.needsAttention")}</p>
            <ul className="mt-3 space-y-3">
              {overdueTasks.slice(0, 3).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/dashboard/tasks?taskId=${task.id}`}
                    className="flex min-h-[52px] items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm font-semibold text-slate-800 active:bg-red-100"
                  >
                    <span className="truncate">{task.title}</span>
                    {getTaskProgressLabel(task) ? (
                      <span className="ml-2 shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-red-600">
                        {getTaskProgressLabel(task)}
                      </span>
                    ) : null}
                    {pendingTaskIds.has(task.id) ? (
                      <span className="ml-2 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Sync
                      </span>
                    ) : null}
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
    </>
  );
}
