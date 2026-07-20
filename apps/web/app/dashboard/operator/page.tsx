"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react";

import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
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
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

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
    <main className="space-y-6 p-4 pb-24 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Outlet Home
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">
          {workspace.outletName ?? "Today's Operations"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mobile-first view for daily checklist execution.
        </p>
      </div>

      <PushNotificationPrompt />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertCircle className="size-5 text-red-600" />
          <p className="mt-3 text-2xl font-bold text-red-700">{overdueTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Overdue</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <Clock3 className="size-5 text-amber-600" />
          <p className="mt-3 text-2xl font-bold text-amber-700">{todayTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Due Today</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <p className="mt-3 text-2xl font-bold text-emerald-700">{completedToday}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Done Today</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <ClipboardCheck className="size-5 text-slate-600" />
          <p className="mt-3 text-2xl font-bold text-slate-950">{openTasks.length}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open</p>
        </div>
      </section>

      <Link
        href="/dashboard/tasks"
        className="flex items-center justify-between rounded-2xl bg-emerald-700 px-5 py-4 text-white shadow-sm"
      >
        <div>
          <p className="text-sm font-bold">Start Today's Tasks</p>
          <p className="text-xs text-emerald-100">{openTasks.length} task waiting</p>
        </div>
        <ClipboardCheck className="size-6" />
      </Link>

      {overdueTasks.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-sm font-bold text-red-800">Needs attention</p>
          <ul className="mt-3 space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <li key={task.id} className="text-sm text-slate-700">
                {task.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
