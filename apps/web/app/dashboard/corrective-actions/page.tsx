"use client";

import Link from "next/link";

import {
  getOutletTaskStatusLabel,
  setCorrectiveAction,
  useOutletTaskStore,
} from "@/shared/outlet-task-store";

function needsCorrectiveAction(score: number, progress: number, status: string) {
  return status === "overdue" || score < 80 || progress < 100;
}

export default function CorrectiveActionsPage() {
  const items = useOutletTaskStore();
  const correctiveActions = items.filter(
    (item) => item.correctiveActionStatus === "open" || needsCorrectiveAction(item.score, item.progress, item.status)
  );
  const openCount = items.filter((item) => item.correctiveActionStatus === "open").length;
  const resolvedCount = items.filter((item) => item.correctiveActionStatus === "resolved").length;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-red-700">Corrective Actions</p>
          <h1 className="text-2xl font-semibold text-slate-950">SOP Follow-up Board</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Track overdue, incomplete, and low-score SOPs until outlet teams close the loop.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
        >
          Back to Command Center
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open Actions</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Resolved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{resolvedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Needs Review</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{correctiveActions.length}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {correctiveActions.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.id}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{item.task}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.outlet} - {item.form} - Due {item.due}
                </p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                {item.correctiveActionStatus === "open" ? "Action Open" : getOutletTaskStatusLabel(item.status)}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Progress</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{item.progress}%</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Score</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{item.score}%</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Operator</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{item.operator}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">Action Required</p>
              <p className="mt-2 text-sm font-semibold text-red-950">
                {item.correctiveActionOwner ?? "Unassigned"} - Due {item.correctiveActionDue ?? "Not set"}
              </p>
              <p className="mt-1 text-sm leading-6 text-red-800">
                {item.correctiveActionNote ?? "Create a corrective action from the SOP Command Center."}
              </p>
            </div>

            {item.correctiveActionStatus === "open" ? (
              <button
                type="button"
                onClick={() =>
                  setCorrectiveAction(item.id, {
                    status: "resolved",
                    owner: item.correctiveActionOwner,
                    due: item.correctiveActionDue,
                    note: item.correctiveActionNote,
                  })
                }
                className="mt-5 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Mark Resolved
              </button>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}