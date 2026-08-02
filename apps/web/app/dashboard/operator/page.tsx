"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";

import { AnnouncementBanner } from "@/features/announcements/components/announcement-banner";
import type { Task } from "@/features/tasks/types";
import { isOpenTaskInInbox, isTaskCompleted } from "@/features/tasks/utils/task-inbox";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { taskService } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";

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

function formatDueLabel(task: Task, overdueLabel: string, todayLabel: string) {
  if (!task.due) return "";
  if (isOverdue(task)) return overdueLabel;
  if (isDueToday(task)) return todayLabel;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return "";
  return due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function OperatorHomePage() {
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
  const overdueTasks = openTasks.filter(isOverdue);
  const todayTasks = openTasks.filter((task) => isDueToday(task) && !isOverdue(task));
  const completedToday = tasks.filter((task) => isTaskCompleted(task) && isDueToday(task)).length;
  const todayTotal = todayTasks.length + overdueTasks.length + completedToday;
  const todayCompletionRate = todayTotal > 0 ? Math.round((completedToday / todayTotal) * 100) : 0;

  const queue = useMemo(() => {
    const rank = (task: Task) => {
      if (isOverdue(task)) return 0;
      if (isDueToday(task)) return 1;
      return 2;
    };
    return [...openTasks].sort((left, right) => {
      const byRank = rank(left) - rank(right);
      if (byRank !== 0) return byRank;
      const leftDue = left.due ? new Date(left.due).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.due ? new Date(right.due).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    });
  }, [openTasks]);

  const nextTask = queue[0];
  const openCorrectiveActions = (correctiveActionsQuery.data ?? []).filter(
    (task) => (task.backendStatus ?? "open") !== "completed"
  );

  return (
    <>
      <main className={`${mobileDashboardMainClass}`}>
        <header className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,#1f4d38_0%,#2f6b4d_48%,#3f8f66_100%)] px-5 py-6 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-emerald-300/20" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
              {t("operator.eyebrow")}
            </p>
            <h1 className="mt-2 max-w-[16ch] text-3xl font-semibold tracking-tight sm:text-4xl">
              {workspace.outletName ?? t("operator.defaultTitle")}
            </h1>
            <p className="mt-2 max-w-md text-sm text-emerald-50/90">{t("operator.subtitle")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                {isOnline ? t("operator.online") : t("operator.offline")}
              </span>
              {pendingSyncCount > 0 ? (
                <span className="rounded-full bg-amber-300/25 px-3 py-1.5 text-amber-50">
                  {t("operator.pendingSync", { count: pendingSyncCount })}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void tasksQuery.refetch();
                  void correctiveActionsQuery.refetch();
                }}
                className="rounded-full bg-white/15 px-3 py-1.5 text-white"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{t("operator.todayTitle")}</h2>
              <p className="text-sm text-slate-500">
                {completedToday}/{todayTotal || 0} {t("operator.doneToday").toLowerCase()}
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-emerald-800">
              {todayCompletionRate}%
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${todayCompletionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600">
            <div className="rounded-2xl bg-red-50 px-2 py-3 text-red-700">
              <p className="text-lg font-semibold tabular-nums">{overdueTasks.length}</p>
              <p>{t("operator.overdue")}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-2 py-3 text-amber-800">
              <p className="text-lg font-semibold tabular-nums">{todayTasks.length}</p>
              <p>{t("operator.dueToday")}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-2 py-3 text-emerald-800">
              <p className="text-lg font-semibold tabular-nums">{completedToday}</p>
              <p>{t("operator.doneToday")}</p>
            </div>
          </div>
        </section>

        {nextTask ? (
          <Link
            href={`/dashboard/tasks?taskId=${nextTask.id}`}
            className="flex items-center justify-between gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white transition hover:bg-slate-900 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                {t("operator.nextUp")}
              </p>
              <p className="mt-1 truncate text-lg font-semibold">{nextTask.title}</p>
              <p className="mt-1 text-sm text-slate-300">
                {formatDueLabel(nextTask, t("operator.overdue"), t("operator.dueToday")) ||
                  t("operator.open")}
              </p>
            </div>
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
              <ArrowRight className="size-5" />
            </span>
          </Link>
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 px-5 py-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-950">{t("operator.allCaughtUp")}</p>
                <p className="text-sm text-emerald-800/80">{t("operator.allCaughtUpBody")}</p>
              </div>
            </div>
          </div>
        )}

        {openCorrectiveActions.length > 0 ? (
          <Link
            href="/dashboard/corrective-actions"
            className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
          >
            <span className="inline-flex items-center gap-2">
              <CircleAlert className="size-4" />
              {t("operator.openCorrectiveActions", { count: openCorrectiveActions.length })}
            </span>
            <ArrowRight className="size-4" />
          </Link>
        ) : null}

        <AnnouncementBanner />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{t("operator.queueTitle")}</h2>
            <Link href="/dashboard/tasks" className="text-sm font-semibold text-emerald-700">
              {t("operator.viewAllTasks")}
            </Link>
          </div>

          {tasksQuery.isLoading ? (
            <p className="text-sm text-slate-500">{t("operator.loadingTasks")}</p>
          ) : queue.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {t("operator.emptyQueue")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
              {queue.slice(0, 8).map((task) => {
                const overdue = isOverdue(task);
                return (
                  <li key={task.id}>
                    <Link
                      href={`/dashboard/tasks?taskId=${task.id}`}
                      className="flex min-h-[64px] items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{task.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock3 className="size-3.5" />
                          {formatDueLabel(task, t("operator.overdue"), t("operator.dueToday")) ||
                            t("operator.open")}
                          {task.executionDraft ? ` · ${t("operator.draftBadge")}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          overdue
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {overdue ? t("operator.overdue") : t("operator.open")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
