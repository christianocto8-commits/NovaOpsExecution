"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BarChartCard,
  DonutChartCard,
  LineChartCard,
  PieChartCard,
} from "@/shared/analytics/charts";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import {
  getOutletTaskCompletionTrend,
  getOutletTaskFormBreakdown,
  getOutletTaskPerformance,
  getOutletTaskStatusDistribution,
  getOutletTaskStatusLabel,
  getOutletTaskStoreSummary,
  OutletTaskStoreItem,
  resetOutletTaskStore,
  setCorrectiveAction,
  useOutletTaskStore,
} from "@/shared/outlet-task-store";
import { RealtimeClock } from "@/shared/realtime";

const columns: EnterpriseColumn<OutletTaskStoreItem>[] = [
  { key: "id", header: "SOP ID", sortable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  { key: "task", header: "Task", sortable: true },
  { key: "form", header: "Form", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (task) => {
      const statusLabel = getOutletTaskStatusLabel(task.status);

      const statusClass =
        task.status === "completed" || task.status === "submitted"
          ? "bg-emerald-50 text-emerald-700"
          : task.status === "draft"
            ? "bg-blue-50 text-blue-700"
            : task.status === "overdue"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700";

      return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      );
    },
  },
  {
    key: "progress",
    header: "Completion",
    sortable: true,
    render: (task) => `${task.progress}%`,
  },
  {
    key: "score",
    header: "Score",
    sortable: true,
    render: (task) => `${task.score}%`,
  },
  { key: "due", header: "Due", sortable: true },
  { key: "operator", header: "Operator", sortable: true },
  { key: "updatedAt", header: "Updated", sortable: true },
];

function getComplianceRate(items: OutletTaskStoreItem[]) {
  if (items.length === 0) return 0;

  const compliant = items.filter((item) => ["submitted", "completed"].includes(item.status)).length;

  return Math.round((compliant / items.length) * 100);
}

function getEvidenceReviewCount(items: OutletTaskStoreItem[]) {
  return items.filter((item) => ["submitted", "completed"].includes(item.status)).length;
}

function needsCorrectiveAction(item: OutletTaskStoreItem) {
  return item.status === "overdue" || item.score < 80 || item.progress < 100;
}

function getCorrectiveActionCount(items: OutletTaskStoreItem[]) {
  return items.filter(needsCorrectiveAction).length;
}

function getOpenCorrectiveActionCount(items: OutletTaskStoreItem[]) {
  return items.filter((item) => item.correctiveActionStatus === "open").length;
}

function getResolvedCorrectiveActionCount(items: OutletTaskStoreItem[]) {
  return items.filter((item) => item.correctiveActionStatus === "resolved").length;
}

function getSopHealthLabel(rate: number) {
  if (rate >= 90) return "Strong";
  if (rate >= 75) return "Watch";
  return "At Risk";
}

function getSopHealthClass(rate: number) {
  if (rate >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (rate >= 75) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

function getOwnerActionQueue(items: OutletTaskStoreItem[]) {
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
    .slice(0, 5);
}

function getOutletCompliance(items: OutletTaskStoreItem[]) {
  const outlets = Array.from(new Set(items.map((item) => item.outlet)));

  return outlets.map((outlet) => {
    const outletItems = items.filter((item) => item.outlet === outlet);
    const completion =
      outletItems.length > 0
        ? Math.round(outletItems.reduce((sum, item) => sum + item.progress, 0) / outletItems.length)
        : 0;
    const score =
      outletItems.length > 0
        ? Math.round(outletItems.reduce((sum, item) => sum + item.score, 0) / outletItems.length)
        : 0;
    const issues = outletItems.filter(
      (item) => item.status === "overdue" || item.status === "draft" || item.score < 80
    ).length;

    return {
      outlet,
      completion,
      score,
      issues,
      total: outletItems.length,
    };
  });
}

export default function ComplianceCenterPage() {
  const outletTaskItems = useOutletTaskStore();
  const [correctiveActionTarget, setCorrectiveActionTarget] = useState<OutletTaskStoreItem | null>(
    null
  );
  const [correctiveActionOwner, setCorrectiveActionOwner] = useState("Store Manager");
  const [correctiveActionDue, setCorrectiveActionDue] = useState("Today 18:00");
  const [correctiveActionNote, setCorrectiveActionNote] = useState("");

  const summary = getOutletTaskStoreSummary(outletTaskItems);
  const completionTrend = getOutletTaskCompletionTrend(outletTaskItems);
  const outletPerformance = getOutletTaskPerformance(outletTaskItems);
  const statusDistribution = getOutletTaskStatusDistribution(outletTaskItems);
  const formDistribution = getOutletTaskFormBreakdown(outletTaskItems);
  const complianceRate = getComplianceRate(outletTaskItems);
  const sopHealthLabel = getSopHealthLabel(complianceRate);
  const evidenceReviewCount = getEvidenceReviewCount(outletTaskItems);
  const correctiveActionCount = getCorrectiveActionCount(outletTaskItems);
  const openCorrectiveActionCount = getOpenCorrectiveActionCount(outletTaskItems);
  const resolvedCorrectiveActionCount = getResolvedCorrectiveActionCount(outletTaskItems);
  const ownerActionQueue = getOwnerActionQueue(outletTaskItems);
  const outletCompliance = getOutletCompliance(outletTaskItems);

  function openCorrectiveAction(item: OutletTaskStoreItem) {
    setCorrectiveActionTarget(item);
    setCorrectiveActionOwner(item.correctiveActionOwner ?? "Store Manager");
    setCorrectiveActionDue(item.correctiveActionDue ?? "Today 18:00");
    setCorrectiveActionNote(
      item.correctiveActionNote ??
        `Follow up ${item.task} at ${item.outlet}. Current score: ${item.score}%.`
    );
  }

  function submitCorrectiveAction() {
    if (!correctiveActionTarget) return;

    setCorrectiveAction(correctiveActionTarget.id, {
      status: "open",
      owner: correctiveActionOwner,
      due: correctiveActionDue,
      note: correctiveActionNote,
    });

    setCorrectiveActionTarget(null);
  }

  function resolveCorrectiveAction(item: OutletTaskStoreItem) {
    setCorrectiveAction(item.id, {
      status: "resolved",
      owner: item.correctiveActionOwner,
      due: item.correctiveActionDue,
      note: item.correctiveActionNote,
    });
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Compliance Center</p>
          <h1 className="text-2xl font-semibold text-slate-950">SOP Compliance Workspace</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Audit SOP execution, overdue checklists, evidence review, and corrective action risk
            across every outlet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/tasks"
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Open Task
          </Link>

          <Link
            href="/dashboard/forms"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
          >
            My Form
          </Link>

          <button
            type="button"
            onClick={resetOutletTaskStore}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Reset Demo Data
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">SOP Compliance</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{complianceRate}%</p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSopHealthClass(
              complianceRate
            )}`}
          >
            {sopHealthLabel}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Evidence Review</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{evidenceReviewCount}</p>
          <p className="mt-3 text-xs text-slate-500">Submitted SOPs waiting for owner QA.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Corrective Actions</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">{correctiveActionCount}</p>
          <p className="mt-3 text-xs text-slate-500">
            {openCorrectiveActionCount} open, {resolvedCorrectiveActionCount} resolved.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Draft / In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{summary.draft}</p>
          <p className="mt-3 text-xs text-slate-500">Saved by outlet teams.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg SOP Score</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.averageScore}%</p>
          <p className="mt-3 text-xs text-slate-500">Quality score across all forms.</p>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold text-slate-950">Owner Action Queue</p>
              <p className="mt-1 text-xs text-slate-500">
                Start here: these tasks need follow-up before the day closes.
              </p>
            </div>
            <Link href="/dashboard/tasks" className="text-sm font-bold text-emerald-700">
              Review all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {ownerActionQueue.length > 0 ? (
              ownerActionQueue.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-950">{item.task}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.outlet} - {item.form} - Due {item.due}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {getOutletTaskStatusLabel(item.status)}
                    </span>
                  </div>

                  {item.correctiveActionStatus === "open" ? (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                            Corrective Action Open
                          </p>
                          <p className="mt-1 text-sm font-semibold text-red-950">
                            {item.correctiveActionOwner} - Due {item.correctiveActionDue}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-red-800">
                            {item.correctiveActionNote}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resolveCorrectiveAction(item)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-100"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">Completion</p>
                      <p className="font-semibold text-slate-900">{item.progress}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Score</p>
                      <p className="font-semibold text-slate-900">{item.score}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Operator</p>
                      <p className="font-semibold text-slate-900">{item.operator}</p>
                    </div>
                  </div>

                  {item.correctiveActionStatus !== "open" ? (
                    <button
                      type="button"
                      onClick={() => openCorrectiveAction(item)}
                      className="mt-4 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                    >
                      Create Corrective Action
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No open task issues right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Outlet Compliance Ranking</p>
          <p className="mt-1 text-xs text-slate-500">
            Quickly spot stores that need coaching or evidence review.
          </p>

          <div className="mt-5 space-y-4">
            {outletCompliance.map((item) => (
              <div key={item.outlet}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.outlet}</p>
                    <p className="text-xs text-slate-500">
                      {item.issues} issue{item.issues === 1 ? "" : "s"} across {item.total} SOPs
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-950">{item.completion}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-700"
                    style={{ width: `${item.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">All Outlet SOP Completion</p>
            <p className="text-xs text-slate-500">
              Calculated from submitted, draft, pending, and overdue tasks.
            </p>
          </div>
          <p className="text-sm font-bold text-emerald-700">{summary.averageProgress}%</p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all duration-700"
            style={{ width: `${summary.averageProgress}%` }}
          />
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="SOP Completion Trend"
          description="Daily outlet SOP completion and submitted count."
          data={completionTrend}
          xKey="day"
          series={[
            { dataKey: "completion", name: "Completion %" },
            { dataKey: "submitted", name: "Submitted" },
          ]}
        />

        <DonutChartCard
          title="SOP Status Mix"
          description="Current SOP lifecycle across outlets."
          data={statusDistribution}
          nameKey="name"
          valueKey="value"
        />

        <BarChartCard
          title="Outlet Progress"
          description="Current SOP completion percentage by outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "progress", name: "Progress %" }]}
        />

        <PieChartCard
          title="Form Template Distribution"
          description="Workload by selected form template."
          data={formDistribution}
          nameKey="name"
          valueKey="value"
        />
      </section>
      <EnterpriseDataTable
        title="Task Execution Register"
        description="Realtime tasks by outlet, status, completion, score, due date, and operator."
        data={outletTaskItems}
        columns={columns}
        searchPlaceholder="Search task..."
        exportable
        exportFileName="sop-execution-register"
        exportSheetName="SOP Execution"
      />
      {correctiveActionTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setCorrectiveActionTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              Corrective Action
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{correctiveActionTarget.task}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {correctiveActionTarget.outlet} - Score {correctiveActionTarget.score}% - Due{" "}
              {correctiveActionTarget.due}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Owner</label>
                <input
                  value={correctiveActionOwner}
                  onChange={(event) => setCorrectiveActionOwner(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Due</label>
                <input
                  value={correctiveActionDue}
                  onChange={(event) => setCorrectiveActionDue(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Action Required</label>
                <textarea
                  value={correctiveActionNote}
                  onChange={(event) => setCorrectiveActionNote(event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCorrectiveActionTarget(null)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCorrectiveAction}
                className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-800"
              >
                Assign Action
              </button>
            </div>
          </div>
        </div>
      ) : null}{" "}
    </main>
  );
}
