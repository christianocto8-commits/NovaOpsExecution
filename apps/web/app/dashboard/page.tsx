"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Building2,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  MapPin
} from "lucide-react";

import { useDashboardReports } from "@/features/dashboard/hooks/use-dashboard-reports";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { ApprovalInboxPanel } from "@/features/workflows/components/approval-inbox-panel";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";
import { formatTaskDue } from "@/features/tasks/utils";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { RealtimeClock } from "@/shared/realtime";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { TaskSkeleton } from "@/shared/skeleton/skeleton";

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
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  tone?: "slate" | "emerald" | "amber" | "blue" | "red";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const valueClass = {
    slate: "text-slate-950",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    red: "text-red-700",
  }[tone];

  const hoverBorderClass = {
    slate: "hover:border-slate-300",
    emerald: "hover:border-emerald-300",
    amber: "hover:border-amber-300",
    blue: "hover:border-blue-300",
    red: "hover:border-red-300",
  }[tone];

  const iconBgClass = {
    slate: "bg-slate-50 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer ${hoverBorderClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {Icon && (
          <div className={`rounded-xl p-2.5 transition duration-300 ${iconBgClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-3 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function PriorityQueue({ tasks, outletMode }: { tasks: Task[]; outletMode?: boolean }) {
  return (
    <div className="mt-5 divide-y divide-slate-100">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="space-y-3 border-b border-slate-100 py-4 last:border-b-0 md:grid md:grid-cols-[1fr_160px_120px] md:gap-3 md:space-y-0">
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">{task.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {outletMode ? "" : `${task.outlet} - `}
                Due {formatTaskDue(task.due)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 md:block">
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{getStatusLabel(task)}</p>
              </div>
              <div className="text-right md:text-left">
                <p className="text-xs text-slate-400">Urgency</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{task.priority}</p>
              </div>
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
  const { settings } = useSettings();
  const capaEnabled = isCapaEnabled(settings);
  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });
  const reportsQuery = useDashboardReports();

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
      <main className={mobileDashboardMainClass + " space-y-6"}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/20">
                <ShieldCheck className="h-3 w-3" />
                Outlet Console
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {workspace.outletName ?? "Outlet"} Operations
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-emerald-100/90 leading-relaxed">
                Focused workspace for completing tasks, reporting checklist details, and reviewing compliance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/tasks"
                className="rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950 shadow-md hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Open Tasks
              </Link>
              <Link
                href="/dashboard/forms"
                className="rounded-2xl bg-emerald-600/50 backdrop-blur-md border border-emerald-500/30 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-600/70 transition-all hover:scale-[1.02]"
              >
                Manual Form
              </Link>
              <div className="rounded-2xl bg-black/10 px-4 py-3 border border-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Realtime</p>
                <RealtimeClock />
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
        </div>

        {tasksQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4 md:gap-4">
          <MetricCard
            label="Completion"
            value={`${getComplianceRate(visibleTasks)}%`}
            description="Completed backend tasks."
            tone="emerald"
            icon={CheckCircle}
          />
          <MetricCard 
            label="Open Tasks" 
            value={openCount} 
            description="Need outlet action." 
            tone="amber" 
            icon={Clock}
          />
          <MetricCard
            label="In Progress"
            value={inProgressCount}
            description="Tasks currently being worked."
            tone="blue"
            icon={Activity}
          />
          <MetricCard
            label="Needs Action"
            value={priorityQueue.length}
            description="Overdue, pending, or high tasks."
            tone="red"
            icon={AlertTriangle}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Outlet Priority Queue</p>
                  <p className="mt-1 text-xs text-slate-500">Real tasks that need attention first.</p>
                </div>
                <Link href="/dashboard/tasks" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
                  View tasks &rarr;
                </Link>
              </div>

              {tasksQuery.isLoading ? (
                <TaskSkeleton />
              ) : (
                <PriorityQueue tasks={priorityQueue} outletMode />
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-900">
                <BookOpen className="h-4 w-4" />
                <p className="text-sm font-bold text-emerald-950">Outlet Operations Guide</p>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Follow these daily steps to keep operations compliant and avoid automatically generated CAPAs:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Complete scheduled SOP tasks on time to prevent overdue statuses.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Submit correct photo evidence inside the outlet geofence range.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Fill in any required execution notes detailing exceptions.</span>
                </li>
              </ul>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Quick Workspace Links</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/dashboard/tasks" className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/55 p-4 text-center hover:bg-slate-50 transition duration-300">
                  <span className="text-lg font-bold text-emerald-800">{openCount}</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Open Tasks</span>
                </Link>
                <Link href="/dashboard/forms" className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/55 p-4 text-center hover:bg-slate-50 transition duration-300">
                  <span className="text-xs font-bold text-emerald-700">Audit Form</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manual Entry</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-white shadow-lg md:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              <Activity className="h-3 w-3 animate-pulse" />
              Live Operations Suite
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Today&apos;s Operations Snapshot
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Real-time executive control center for task compliance, open risks, and automated corrective actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/tasks"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-md hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
            >
              Manage Tasks
            </Link>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Realtime Clock</p>
              <RealtimeClock />
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 -mr-24 -mt-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl" />
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Task Compliance"
          value={
            reportsQuery.summary
              ? `${reportsQuery.summary.compliance_rate}%`
              : `${getComplianceRate(visibleTasks)}%`
          }
          description="Live compliance from reports API."
          tone="emerald"
          icon={CheckCircle}
        />
        <MetricCard
          label="Open Tasks"
          value={reportsQuery.summary?.open_tasks ?? openCount}
          description="Backend tasks awaiting completion."
          tone="amber"
          icon={Clock}
        />
        <MetricCard
          label="Overdue"
          value={reportsQuery.summary?.overdue_tasks ?? priorityQueue.length}
          description="Tasks past due date."
          tone="red"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Completion Rate"
          value={
            reportsQuery.summary
              ? `${reportsQuery.summary.completion_rate}%`
              : `${getAverageCompletion(visibleTasks)}%`
          }
          description="Completed vs total tasks."
          tone="blue"
          icon={TrendingUp}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Outlet Score Snapshot</p>
                <p className="mt-1 text-xs text-slate-500">Compliance score by outlet from live task data.</p>
              </div>
              <Link href="/dashboard/compliance" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
                Full compliance &rarr;
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {outletProgress.slice(0, 8).map((item) => {
                const score = item.progress;
                let toneClass = "border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-emerald-50/10 text-emerald-700 hover:border-emerald-400";
                let textClass = "text-emerald-700";
                let badgeBg = "bg-emerald-100/60 text-emerald-800";

                if (score < 50) {
                  toneClass = "border-red-100 bg-gradient-to-br from-red-50/40 to-red-50/10 text-red-700 hover:border-red-400";
                  textClass = "text-red-700";
                  badgeBg = "bg-red-100/60 text-red-800";
                } else if (score < 85) {
                  toneClass = "border-amber-100 bg-gradient-to-br from-amber-50/40 to-amber-50/10 text-amber-700 hover:border-amber-400";
                  textClass = "text-amber-700";
                  badgeBg = "bg-amber-100/60 text-amber-800";
                }

                return (
                  <Link
                    key={item.outlet}
                    href="/dashboard/reports?tab=riwayat"
                    className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${toneClass}`}
                  >
                    <div>
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeBg}`}>
                        Score
                      </span>
                      <p className="mt-2 truncate text-sm font-bold text-slate-900">{item.outlet}</p>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <p className={`text-2xl font-extrabold tracking-tight ${textClass}`}>{score}%</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.open} open
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Quick Actions:</span>
              <Link
                href="/dashboard/compliance"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors"
              >
                Compliance Panel
              </Link>
              <Link
                href="/dashboard/reports"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100/80 transition-colors"
              >
                Reports Hub
              </Link>
              {capaEnabled ? (
                <Link
                  href="/dashboard/corrective-actions"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100/80 transition-colors"
                >
                  CAPA Hub
                </Link>
              ) : null}
              <Link
                href="/dashboard/reports?tab=bukti"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Review Evidence
              </Link>
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
              <Link href="/dashboard/reports" className="text-sm font-bold text-emerald-700 hover:text-emerald-850 transition-colors">
                Open reports &rarr;
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {outletProgress.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No synced outlet task progress yet.
                </div>
              ) : (
                outletProgress.map((item) => (
                  <article key={item.outlet} className="rounded-2xl border border-slate-200 p-5 bg-white transition hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 duration-300 ease-out cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950 text-base">{item.outlet}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.completed} completed / {item.total} total
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-base font-bold text-emerald-700">{item.progress}%</span>
                        {item.progress === 100 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Completed</span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">In Progress</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700 transition-all duration-500 ease-out"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500 font-medium">
                      {item.open > 0 ? `${item.open} task${item.open > 1 ? 's' : ''} still open.` : 'All tasks completed!'}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Priority Attention</p>
                <p className="mt-1 text-xs text-slate-500">
                  Real backend tasks that need action first.
                </p>
              </div>
              <Link href="/dashboard/compliance" className="text-sm font-bold text-emerald-700 hover:text-emerald-855 transition-colors">
                Review details &rarr;
              </Link>
            </div>

            {tasksQuery.isLoading ? (
              <TaskSkeleton />
            ) : (
              <PriorityQueue tasks={priorityQueue} />
            )}
          </section>

          <div className="rounded-3xl border border-slate-200 bg-white p-1 overflow-hidden shadow-sm">
            <ApprovalInboxPanel compact limit={5} />
          </div>
        </div>
      </div>
    </main>
  );
}
