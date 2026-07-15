"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;
  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function needsCorrectiveAction(task: Task) {
  return (
    task.status !== "Completed" &&
    (isOverdue(task) || task.status === "Pending" || ["Critical", "High"].includes(task.priority))
  );
}

function getStatusLabel(task: Task) {
  if (isOverdue(task)) return "Overdue";
  if (task.priority === "Critical") return "Critical";
  if (task.priority === "High") return "High";
  return task.status;
}

function getReason(task: Task) {
  if (isOverdue(task)) return "Task is past due and still open.";
  if (task.priority === "Critical") return "Critical urgency task needs follow-up.";
  if (task.priority === "High") return "High urgency task needs follow-up.";
  return "Task is not completed yet.";
}

export default function CorrectiveActionsPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
    retry: false,
  });

  const resolveMutation = useMutation({
    mutationFn: (taskId: string) => taskService.updateStatus(taskId, "completed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    },
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const correctiveActions = useMemo(() => tasks.filter(needsCorrectiveAction), [tasks]);
  const completedCount = tasks.filter((task) => task.status === "Completed").length;
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-red-700">Corrective Actions</p>
          <h1 className="text-2xl font-semibold text-slate-950">Task Follow-up Board</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Real overdue, pending, high, and critical tasks loaded from backend.
          </p>
        </div>

        <Link
          href="/dashboard/compliance"
          className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
        >
          Back to Compliance
        </Link>
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Needs Action</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{correctiveActions.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{overdueCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{completedCount}</p>
        </div>
      </section>

      {tasksQuery.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading corrective actions...
        </div>
      ) : correctiveActions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-bold text-slate-800">No real corrective actions right now</p>
          <p className="mt-1 text-sm text-slate-500">
            Overdue, pending, high, or critical tasks will appear here.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {correctiveActions.map((task) => (
            <article key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Task {task.id}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{task.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.outlet} - Due {task.due || "-"}
                  </p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {getStatusLabel(task)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{task.status}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Urgency</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{task.priority}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Assignee</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{task.assignee}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                  Action Required
                </p>
                <p className="mt-2 text-sm font-semibold text-red-950">{getReason(task)}</p>
                <p className="mt-1 text-sm leading-6 text-red-800">
                  {task.description || "Review the task, request evidence if needed, then close it."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => resolveMutation.mutate(task.id)}
                disabled={resolveMutation.isPending}
                className="mt-5 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resolveMutation.isPending ? "Updating..." : "Mark Task Completed"}
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
