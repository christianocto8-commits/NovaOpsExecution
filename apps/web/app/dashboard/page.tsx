"use client";

import Link from "next/link";

import {
  getOutletTaskStoreSummary,
  getOutletTaskStatusLabel,
  OutletTaskStoreItem,
  useOutletTaskStore,
} from "@/shared/outlet-task-store";
import { RealtimeClock } from "@/shared/realtime";

function getComplianceRate(items: OutletTaskStoreItem[]) {
  if (items.length === 0) return 0;

  const compliant = items.filter((item) => ["submitted", "completed"].includes(item.status)).length;

  return Math.round((compliant / items.length) * 100);
}

function getOpenActionCount(items: OutletTaskStoreItem[]) {
  return items.filter((item) => item.correctiveActionStatus === "open").length;
}

function getUrgentQueue(items: OutletTaskStoreItem[]) {
  return items
    .filter(
      (item) =>
        item.status === "overdue" ||
        item.status === "draft" ||
        item.score < 80 ||
        item.correctiveActionStatus === "open"
    )
    .sort((first, second) => {
      const priority = { overdue: 0, draft: 1, pending: 2, submitted: 3, completed: 4 };
      return priority[first.status] - priority[second.status] || first.score - second.score;
    })
    .slice(0, 4);
}

export default function DashboardPage() {
  const items = useOutletTaskStore();
  const summary = getOutletTaskStoreSummary(items);
  const complianceRate = getComplianceRate(items);
  const openActions = getOpenActionCount(items);
  const urgentQueue = getUrgentQueue(items);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Executive Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Today&apos;s Operations Snapshot
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            A focused view of SOP health, open risks, and the work that needs attention now.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">SOP Compliance</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{complianceRate}%</p>
          <p className="mt-3 text-xs text-slate-500">Submitted or completed SOPs today.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg SOP Score</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.averageScore}%</p>
          <p className="mt-3 text-xs text-slate-500">Quality score across all outlet forms.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Draft / In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{summary.draft}</p>
          <p className="mt-3 text-xs text-slate-500">Saved work that still needs completion.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open Corrective Actions</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">{openActions}</p>
          <p className="mt-3 text-xs text-slate-500">Issues assigned for owner follow-up.</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Priority Attention</p>
              <p className="mt-1 text-xs text-slate-500">
                The shortest list of SOP issues that need action first.
              </p>
            </div>
            <Link href="/dashboard/compliance" className="text-sm font-bold text-emerald-700">
              Review details
            </Link>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {urgentQueue.map((item) => (
              <div key={item.id} className="grid gap-3 py-4 md:grid-cols-[1fr_160px_120px]">
                <div>
                  <p className="font-semibold text-slate-950">{item.task}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.outlet} - {item.form} - Due {item.due}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {getOutletTaskStatusLabel(item.status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Score</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.score}%</p>
                </div>
              </div>
            ))}
          </div>
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
                Audit SOPs, evidence, outlet ranking, and corrective actions.
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
    </main>
  );
}
