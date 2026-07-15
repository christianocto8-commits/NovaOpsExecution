"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { RealtimeClock } from "@/shared/realtime";

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;
  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function getCompletion(task: Task) {
  if (task.status === "Completed") return 100;
  if (task.status === "In Progress") return 50;
  return 0;
}

function getComplianceRate(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.status === "Completed").length / tasks.length) * 100);
}

function getAverageCompletion(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + getCompletion(task), 0) / tasks.length);
}

function getNeedsAction(tasks: Task[]) {
  return tasks
    .filter(
      (task) =>
        task.status !== "Completed" &&
        (isOverdue(task) || task.status === "Pending" || ["Critical", "High"].includes(task.priority))
    )
    .sort((first, second) => getCompletion(first) - getCompletion(second))
    .slice(0, 4);
}

function getVisibleTasks(tasks: Task[], outletName?: string) {
  if (!outletName) return tasks;

  return tasks.filter((task) => task.outlet === outletName || task.targetOutlets?.includes(outletName));
}

function getStatusLabel(task: Task) {
  if (isOverdue(task)) return "Overdue";
  return task.status;
}

function getOutletProgress(tasks: Task[]) {
  const outletMap = new Map<string, Task[]>();

  tasks.forEach((task) => {
    outletMap.set(task.outlet, [...(outletMap.get(task.outlet) ?? []), task]);
  });

  return Array.from(outletMap, ([outlet, outletTasks]) => {
    const completed = outletTasks.filter((task) => task.status === "Completed").length;
    const progress = Math.round(
      outletTasks.reduce((sum, task) => sum + getCompletion(task), 0) /
        Math.max(outletTasks.length, 1)
    );

    return {
      outlet,
      total: outletTasks.length,
      completed,
      open: outletTasks.length - completed,
      progress,
    };
  }).sort((first, second) => second.progress - first.progress);
}

function MetricCard({
  label,
  value,
  description,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  description: string;
  tone?: "slate" | "emerald" | "amber" | "blue" | "red";
}) {
  const valueClass = {
    slate: "text-slate-950",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function PriorityQueue({ tasks, outletMode }: { tasks: Task[]; outletMode?: boolean }) {
  return (
    <div className="mt-5 divide-y divide-slate-100">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="grid gap-3 py-4 md:grid-cols-[1fr_160px_120px]">
            <div>
              <p className="font-semibold text-slate-950">{task.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {outletMode ? "" : `${task.outlet} - `}
                Due {task.due || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{getStatusLabel(task)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Urgency</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{task.priority}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No urgent task data right now.
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
    retry: false,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const visibleTasks = useMemo(
    () => (workspace.mode === "outlet" ? getVisibleTasks(tasks, workspace.outletName) : tasks),
    [tasks, workspace.mode, workspace.outletName]
  );
  const priorityQueue = getNeedsAction(visibleTasks);
  const inProgressCount = visibleTasks.filter((task) => task.status === "In Progress").length;
  const openCount = visibleTasks.filter((task) => task.status !== "Completed").length;
  const outletProgress = getOutletProgress(visibleTasks);

  if (workspace.mode === "outlet") {
    return (
      <main className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-emerald-700">Outlet Dashboard</p>
            <h1 className="text-2xl font-semibold text-slate-950">
              {workspace.outletName ?? "Outlet"} Operations
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Focused view from real backend tasks assigned to this outlet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/tasks"
              className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
            >
              Open Tasks
            </Link>
            <Link
              href="/dashboard/forms"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
            >
              Manual Form
            </Link>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Realtime
              </p>
              <RealtimeClock />
            </div>
          </div>
        </div>

        {tasksQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Completion"
            value={`${getComplianceRate(visibleTasks)}%`}
            description="Completed backend tasks."
          />
          <MetricCard label="Open Tasks" value={openCount} description="Need outlet action." tone="amber" />
          <MetricCard
            label="In Progress"
            value={inProgressCount}
            description="Tasks currently being worked."
            tone="blue"
          />
          <MetricCard
            label="Needs Action"
            value={priorityQueue.length}
            description="Overdue, pending, high, or critical tasks."
            tone="red"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Outlet Priority Queue</p>
              <p className="mt-1 text-xs text-slate-500">Real tasks that need attention first.</p>
            </div>
            <Link href="/dashboard/tasks" className="text-sm font-bold text-emerald-700">
              View tasks
            </Link>
          </div>

          {tasksQuery.isLoading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
              Loading task data...
            </div>
          ) : (
            <PriorityQueue tasks={priorityQueue} outletMode />
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Executive Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Today&apos;s Operations Snapshot
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Real backend view of task health, open risks, and operational follow-up.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/compliance"
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Open Compliance Center
          </Link>
          <Link
            href="/dashboard/tasks"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Task
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Task Compliance"
          value={`${getComplianceRate(visibleTasks)}%`}
          description="Completed backend tasks."
        />
        <MetricCard
          label="Avg Completion"
          value={`${getAverageCompletion(visibleTasks)}%`}
          description="Average progress from backend status."
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          description="Backend tasks currently in progress."
          tone="blue"
        />
        <MetricCard
          label="Needs Action"
          value={priorityQueue.length}
          description="Overdue, pending, high, or critical tasks."
          tone="red"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Priority Attention</p>
              <p className="mt-1 text-xs text-slate-500">
                Real backend tasks that need action first.
              </p>
            </div>
            <Link href="/dashboard/compliance" className="text-sm font-bold text-emerald-700">
              Review details
            </Link>
          </div>

          {tasksQuery.isLoading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
              Loading task data...
            </div>
          ) : (
            <PriorityQueue tasks={priorityQueue} />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Workspaces</p>
          <p className="mt-1 text-xs text-slate-500">Jump into the area that matches the job.</p>

          <div className="mt-5 space-y-3">
            <Link
              href="/dashboard/compliance"
              className="block rounded-2xl border border-emerald-100 bg-emerald-50 p-4 hover:bg-emerald-100"
            >
              <p className="font-semibold text-emerald-900">Compliance Center</p>
              <p className="mt-1 text-sm text-emerald-700">
                Review real backend task compliance and follow-up.
              </p>
            </Link>
            <Link
              href="/dashboard/tasks"
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
            >
              <p className="font-semibold text-slate-950">Task</p>
              <p className="mt-1 text-sm text-slate-500">Assign, execute, and track outlet work.</p>
            </Link>
            <Link
              href="/dashboard/reports"
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
            >
              <p className="font-semibold text-slate-950">Reports</p>
              <p className="mt-1 text-sm text-slate-500">Review submitted reports and analytics.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Outlet Sync Progress</p>
            <p className="mt-1 text-xs text-slate-500">
              Result and progress from backend tasks across all accessible outlets.
            </p>
          </div>
          <Link href="/dashboard/reports" className="text-sm font-bold text-emerald-700">
            Open reports
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {outletProgress.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No synced outlet task progress yet.
            </div>
          ) : (
            outletProgress.map((item) => (
              <article key={item.outlet} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.outlet}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.completed} completed / {item.total} total
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">{item.progress}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">{item.open} task still open.</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
