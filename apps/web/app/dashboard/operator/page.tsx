"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";

import { AnnouncementBanner } from "@/features/announcements/components/announcement-banner";
import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
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
import { OutletStreakCard } from "@/features/gamification/components/outlet-streak-card";
import { LeaderboardPanel } from "@/features/gamification/components/leaderboard-panel";
import { TaskSkeleton } from "@/shared/skeleton/skeleton";

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
  const overdueCount = openTasks.filter(isOverdue).length;
  const completedToday = tasks.filter((task) => isTaskCompleted(task) && isDueToday(task)).length;

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
    <main className={mobileDashboardMainClass}>
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
            {overdueCount > 0 ? (
              <span className="rounded-full bg-red-400/30 px-3 py-1.5 text-red-50">
                {overdueCount} {t("operator.overdue").toLowerCase()}
              </span>
            ) : null}
            {completedToday > 0 ? (
              <span className="rounded-full bg-white/15 px-3 py-1.5">
                {completedToday} {t("operator.doneToday").toLowerCase()}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Outlet Gamification Streak Card */}
      <OutletStreakCard />

      {nextTask ? (
        <Link
          href={`/dashboard/tasks?taskId=${nextTask.id}`}
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-emerald-800/40 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-6 py-5 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-500/10 blur-xl transition group-hover:bg-emerald-500/20" />
          <div className="relative min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("operator.nextUp")}
            </span>
            <p className="mt-2 truncate text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition">
              {nextTask.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
              <Clock3 className="size-3.5 text-emerald-400" />
              {formatDueLabel(nextTask, t("operator.overdue"), t("operator.dueToday")) ||
                t("operator.open")}
            </p>
          </div>
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-md transition group-hover:scale-105 group-hover:bg-emerald-400">
            <ArrowRight className="size-6" />
          </span>
        </Link>
      ) : (
        <div className="rounded-[1.75rem] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700">
              <CheckCircle2 className="size-6 text-emerald-700" />
            </span>
            <div>
              <p className="font-bold text-emerald-950">{t("operator.allCaughtUp")}</p>
              <p className="text-xs text-emerald-800/80">{t("operator.allCaughtUpBody")}</p>
            </div>
          </div>
        </div>
      )}

      {openCorrectiveActions.length > 0 ? (
        <Link
          href="/dashboard/corrective-actions"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-100/80"
        >
          <span className="inline-flex items-center gap-2">
            <CircleAlert className="size-4 text-amber-600" />
            {t("operator.openCorrectiveActions", { count: openCorrectiveActions.length })}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}

      <AnnouncementBanner />

      <PushNotificationPrompt compact />

      {/* Gamification Outlet Standings */}
      <LeaderboardPanel />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            {t("operator.queueTitle")}
          </h2>
          <Link
            href="/dashboard/tasks"
            className="text-xs font-bold text-emerald-700 transition hover:text-emerald-800"
          >
            {t("operator.viewAllTasks")} →
          </Link>
        </div>

        {tasksQuery.isLoading ? (
          <TaskSkeleton />
        ) : queue.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            {t("operator.emptyQueue")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm">
            {queue.slice(0, 6).map((task) => {
              const overdue = isOverdue(task);
              return (
                <li key={task.id}>
                  <Link
                    href={`/dashboard/tasks?taskId=${task.id}`}
                    className="flex min-h-[64px] items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50/80 active:bg-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{task.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="size-3.5 text-slate-400" />
                        {formatDueLabel(task, t("operator.overdue"), t("operator.dueToday")) ||
                          t("operator.open")}
                        {task.executionDraft ? ` · ${t("operator.draftBadge")}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ${
                        overdue
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
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
  );
}
