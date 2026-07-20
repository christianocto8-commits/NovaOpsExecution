"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileText, RefreshCw } from "lucide-react";

import { useFormTemplates } from "@/features/forms/hooks/use-form-templates";
import {
  HistoryDetailDrawer,
  type HistoryDetailSelection,
} from "@/features/history/components/history-detail-drawer";
import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { getExecutionSessions } from "@/services/execution-session.service";
import { formSubmissionService } from "@/services/form-submission.service";
import { taskService } from "@/services/task.service";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

type HistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "task" | "form";
  timestamp: string;
  details: string;
  task?: Task;
  sessionId?: number;
  formSubmissionId?: number;
  formTemplateId?: number;
  templateName?: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value || "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function taskMatchesOutlet(task: Task, outletName?: string, outletId?: string) {
  if (!outletName && !outletId) return true;
  if (outletId && task.outletId === outletId) return true;
  if (outletName && task.outlet === outletName) return true;
  return Boolean(outletName && task.targetOutlets?.includes(outletName));
}

function buildHistoryItems(args: {
  tasks: Task[];
  executionSessions: Awaited<ReturnType<typeof getExecutionSessions>>;
  formSubmissions: Awaited<ReturnType<typeof formSubmissionService.list>>;
  templateNameById: Map<string, string>;
  outletName?: string;
  outletId?: string;
}) {
  const { tasks, executionSessions, formSubmissions, templateNameById, outletName, outletId } =
    args;

  const visibleTasks = tasks.filter((task) => taskMatchesOutlet(task, outletName, outletId));
  const taskTitleById = new Map(visibleTasks.map((task) => [task.id, task.title]));

  const completedTaskItems: HistoryItem[] = visibleTasks
    .filter((task) => task.status === "Completed")
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: `${task.outlet} - ${task.assignee}`,
      type: "task",
      timestamp: task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due,
      details: task.execution?.note || task.description || "Task completed.",
      task,
    }));

  const sessionItems: HistoryItem[] = executionSessions
    .filter((session) => session.status === "completed" && session.task_id)
    .map((session) => {
      const taskId = String(session.task_id);
      const taskTitle = taskTitleById.get(taskId) ?? `Task ${taskId}`;

      return {
        id: `session-${session.id}`,
        title: taskTitle,
        subtitle: "Task execution session",
        type: "task" as const,
        timestamp: session.submitted_at ?? new Date().toISOString(),
        details: `${Object.keys(session.answers_json ?? {}).length} response(s) submitted.`,
        sessionId: session.id,
      };
    });

  const formItems: HistoryItem[] = formSubmissions.map((submission) => {
    const templateName =
      templateNameById.get(String(submission.form_template_id)) ??
      `Form ${submission.form_template_id}`;

    return {
      id: `form-${submission.id}`,
      title: templateName,
      subtitle: `Outlet ${submission.outlet_id}`,
      type: "form" as const,
      timestamp: submission.submitted_at ?? new Date().toISOString(),
      details: `${submission.answers.length} answer(s) submitted.`,
      formSubmissionId: submission.id,
      formTemplateId: submission.form_template_id,
      templateName,
    };
  });

  const merged = new Map<string, HistoryItem>();

  [...completedTaskItems, ...sessionItems, ...formItems].forEach((item) => {
    merged.set(item.id, item);
  });

  return Array.from(merged.values()).sort(
    (first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()
  );
}

export default function HistoryPage() {
  const [selection, setSelection] = useState<HistoryDetailSelection | null>(null);

  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const outletId =
    workspace.mode === "outlet" && workspace.outletId ? workspace.outletId : undefined;
  const numericOutletId = outletId && /^\d+$/.test(outletId) ? Number(outletId) : undefined;

  const taskQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
  });

  const executionSessionsQuery = useQuery({
    queryKey: queryKeys.history.executionSessions(),
    queryFn: () => getExecutionSessions({ status: "completed" }),
  });

  const formSubmissionsQuery = useQuery({
    queryKey: [...queryKeys.history.formSubmissions(), numericOutletId ?? "all"],
    queryFn: () =>
      formSubmissionService.list(
        numericOutletId !== undefined ? { outletId: numericOutletId } : undefined
      ),
  });

  const templatesQuery = useFormTemplates();

  const templateNameById = useMemo(() => {
    const map = new Map<string, string>();

    (templatesQuery.data ?? []).forEach((template) => {
      map.set(template.id, template.name);
    });

    return map;
  }, [templatesQuery.data]);

  const tasks = taskQuery.data ?? [];
  const executionSessions = executionSessionsQuery.data ?? [];
  const formSubmissions = formSubmissionsQuery.data ?? [];

  const historyItems = useMemo(
    () =>
      buildHistoryItems({
        tasks,
        executionSessions,
        formSubmissions,
        templateNameById,
        outletName: workspace.mode === "outlet" ? workspace.outletName : undefined,
        outletId,
      }),
    [
      tasks,
      executionSessions,
      formSubmissions,
      templateNameById,
      workspace.mode,
      workspace.outletName,
      outletId,
    ]
  );

  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const isLoading =
    taskQuery.isLoading || executionSessionsQuery.isLoading || formSubmissionsQuery.isLoading;
  const isError =
    taskQuery.isError || executionSessionsQuery.isError || formSubmissionsQuery.isError;

  function refreshHistory() {
    void taskQuery.refetch();
    void executionSessionsQuery.refetch();
    void formSubmissionsQuery.refetch();
    void templatesQuery.refetch();
  }

  function openHistoryItem(item: HistoryItem) {
    if (item.task) {
      setSelection({ kind: "task", task: item.task });
      return;
    }

    if (item.sessionId != null) {
      const session = executionSessions.find((row) => row.id === item.sessionId);
      if (session) {
        setSelection({ kind: "session", session, taskTitle: item.title });
      }
      return;
    }

    if (item.formSubmissionId != null) {
      const submission = formSubmissions.find((row) => row.id === item.formSubmissionId);
      if (submission) {
        setSelection({
          kind: "form",
          submission,
          templateName: item.templateName ?? `Form ${submission.form_template_id}`,
        });
      }
    }
  }

  return (
    <main className="space-y-6 p-6 pb-24 lg:pb-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Outlet Operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Task History
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Completed tasks, execution sessions, and manual form submissions loaded from backend.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshHistory}
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
          <p className="mt-2 text-2xl font-bold text-slate-950">{formSubmissions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            History Rows
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{historyItems.length}</p>
        </div>
      </section>

      {isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some history sources failed to load. Refresh after the backend finishes waking up on
          Render.
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-950">Activity Timeline</p>
          <p className="mt-1 text-sm text-slate-500">
            This timeline only shows submitted or completed work from the API.
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-slate-500">Loading history...</div>
        ) : historyItems.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="mx-auto size-9 text-slate-300" />
            <p className="mt-3 font-bold text-slate-800">No history yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Complete a task or submit a manual form, then it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openHistoryItem(item)}
                className="flex w-full gap-4 p-5 text-left transition hover:bg-slate-50"
              >
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
                  <p className="mt-2 text-xs font-semibold text-emerald-700">Tap to view submission</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <HistoryDetailDrawer selection={selection} onClose={() => setSelection(null)} />
    </main>
  );
}
