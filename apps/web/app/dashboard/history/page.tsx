"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileText, RefreshCw } from "lucide-react";

import { queryKeys } from "@/lib/query/keys";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";

const TASK_STORAGE_KEY = "novaops_tasks_mock";

type ManualFormSubmission = {
  id: string;
  outlet?: string;
  templateId?: string;
  templateName?: string;
  responses?: Record<string, string>;
  submittedAt?: string;
};

type HistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "task" | "form";
  timestamp: string;
  details: string;
};

function loadManualSubmissions() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem("novaops_manual_form_submissions") ?? "[]");
    return Array.isArray(parsed) ? (parsed as ManualFormSubmission[]) : [];
  } catch {
    return [];
  }
}

function loadLocalTasks() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

function mergeTasks(primaryTasks: Task[], fallbackTasks: Task[]) {
  const taskMap = new Map<string, Task>();

  fallbackTasks.forEach((task) => taskMap.set(task.id, task));
  primaryTasks.forEach((task) => taskMap.set(task.id, task));

  return Array.from(taskMap.values());
}

function taskMatchesOutlet(task: Task, outletName?: string) {
  if (!outletName) return false;

  return task.outlet === outletName || Boolean(task.targetOutlets?.includes(outletName));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value || "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTaskTimestamp(task: Task) {
  return task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due;
}

function toHistoryItems(tasks: Task[], submissions: ManualFormSubmission[]) {
  const completedTaskItems: HistoryItem[] = tasks
    .filter((task) => task.status === "Completed" || task.execution)
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: `${task.outlet} - ${task.assignee}`,
      type: "task",
      timestamp: getTaskTimestamp(task) || new Date().toISOString(),
      details: task.execution?.note || task.description || "Task completed.",
    }));

  const manualFormItems: HistoryItem[] = submissions
    .filter((submission) => submission.submittedAt)
    .map((submission) => ({
      id: `form-${submission.id}`,
      title: submission.templateName ?? "Manual form submission",
      subtitle: submission.outlet ?? "Outlet",
      type: "form",
      timestamp: submission.submittedAt ?? new Date().toISOString(),
      details: `${Object.keys(submission.responses ?? {}).length} response(s) submitted.`,
    }));

  return [...completedTaskItems, ...manualFormItems].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()
  );
}

export default function HistoryPage() {
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const [manualSubmissions, setManualSubmissions] =
    useState<ManualFormSubmission[]>(loadManualSubmissions);
  const [localTasks, setLocalTasks] = useState<Task[]>(loadLocalTasks);
  const taskQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
    retry: false,
  });

  const tasks = useMemo(() => {
    const backendTasks = taskQuery.data ?? [];

    if (workspace.mode !== "outlet") return mergeTasks(backendTasks, localTasks);

    const localOutletTasks = localTasks.filter((task) =>
      taskMatchesOutlet(task, workspace.outletName)
    );

    if (taskQuery.isSuccess) {
      return mergeTasks(backendTasks, localOutletTasks);
    }

    return localOutletTasks;
  }, [localTasks, taskQuery.data, taskQuery.isSuccess, workspace.mode, workspace.outletName]);

  const historyItems = useMemo(
    () => toHistoryItems(tasks, manualSubmissions),
    [manualSubmissions, tasks]
  );

  const completedTasks = tasks.filter((task) => task.status === "Completed").length;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Outlet Operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Task History
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Completed task and manual form history from the active account data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setManualSubmissions(loadManualSubmissions());
            setLocalTasks(loadLocalTasks());
            void taskQuery.refetch();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Completed Tasks
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{completedTasks}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Manual Forms
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{manualSubmissions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            History Rows
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{historyItems.length}</p>
        </div>
      </section>

      {taskQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Server history sync is unavailable for this account. Showing local history that matches
          the active outlet only.
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-950">Activity Timeline</p>
          <p className="mt-1 text-sm text-slate-500">
            This timeline only shows submitted or completed work.
          </p>
        </div>

        {taskQuery.isLoading ? (
          <div className="p-8 text-sm text-slate-500">Loading history...</div>
        ) : historyItems.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="mx-auto size-9 text-slate-300" />
            <p className="mt-3 font-bold text-slate-800">No real history yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Complete a task or submit a manual form, then it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyItems.map((item) => (
              <article key={item.id} className="flex gap-4 p-5">
                <div
                  className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    item.type === "task"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {item.type === "task" ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                    <time className="text-xs font-semibold text-slate-400">
                      {formatDate(item.timestamp)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.details}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
