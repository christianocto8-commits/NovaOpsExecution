"use client";

import { CheckCircle2, Clock3, ClipboardCheck, PlayCircle } from "lucide-react";

import { getFormTemplate } from "@/features/forms/data/mock-form-templates";
import { OutletTaskExecutionDrawer } from "@/features/tasks/components/outlet-task-execution-drawer";
import { useTaskWorkspace } from "@/features/tasks/hooks/use-task-workspace";
import { Task } from "@/features/tasks/types";
import { formatTaskDue } from "@/features/tasks/utils";
import { calculateFormProgress } from "@/shared/form-progress";
import { updateOutletTaskStoreItem } from "@/shared/outlet-task-store";
import { RealtimeClock } from "@/shared/realtime";

function getTaskProgress(task: Task) {
  if (!task.executionDraft || !task.formTemplateId) {
    return task.execution ? 100 : 0;
  }

  const template = getFormTemplate(task.formTemplateId);

  if (!template) return task.execution ? 100 : 0;

  const fields = template.fields.map((field) => ({
    id: field.id,
    label: field.label,
    required: field.required,
  }));

  return calculateFormProgress(fields, task.executionDraft.formResponses).percentage;
}

function getOperatorStatus(task: Task) {
  if (task.execution?.reviewStatus === "approved") return "Approved";
  if (task.execution?.reviewStatus === "rejected") return "Needs Fix";
  if (task.execution?.reviewStatus === "pending_review") return "In Review";
  if (task.executionDraft) return "Draft";
  return "Ready";
}

function getOperatorStatusClass(task: Task) {
  const status = getOperatorStatus(task);

  if (status === "Approved") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "Needs Fix") return "bg-red-50 text-red-700 border-red-100";
  if (status === "In Review") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "Draft") return "bg-blue-50 text-blue-700 border-blue-100";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getPrimaryActionLabel(task: Task) {
  if (task.execution?.reviewStatus === "approved") return "View";
  if (task.execution?.reviewStatus === "pending_review") return "View";
  if (task.executionDraft || task.execution?.reviewStatus === "rejected") return "Continue";
  return "Start";
}

export function OperatorWorkspace() {
  const {
    tasks,
    selectedTask,
    executionForm,
    setExecutionForm,
    isExecutionOpen,
    openExecution,
    closeExecution,
    cancelExecutionChanges,
    saveExecutionDraft,
    submitTaskExecution,
    isBackendConnected,
  } = useTaskWorkspace();

  const assignedTasks = tasks.filter((task) => task.assignee === "Outlet Team");
  const remainingTasks = assignedTasks.filter(
    (task) => task.execution?.reviewStatus !== "approved"
  );
  const completedTasks = assignedTasks.length - remainingTasks.length;
  const nextTask = remainingTasks[0] ?? assignedTasks[0] ?? null;

  return (
    <main className="min-h-screen bg-[#F7FAF8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Operator View</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Today&apos;s SOP Tasks</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete checklist fields, attach evidence, and submit for owner review.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Realtime
              </p>
              <RealtimeClock />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Assigned</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{assignedTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Remaining</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{remainingTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Approved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{completedTasks}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Connection
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {isBackendConnected ? "Backend synced" : "Demo fallback"}
                </p>
              </div>
              <ClipboardCheck className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </section>

        {nextTask ? (
          <section className="rounded-3xl border border-emerald-100 bg-emerald-700 p-5 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">Next up</p>
            <h2 className="mt-2 text-xl font-bold">{nextTask.title}</h2>
            <p className="mt-2 text-sm text-emerald-50">
              {nextTask.outlet} - Due {formatTaskDue(nextTask.due)}
            </p>
            <button
              type="button"
              onClick={() => openExecution(nextTask)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" />
              {getPrimaryActionLabel(nextTask)} Task
            </button>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-bold text-slate-950">Task Queue</h2>
            <span className="text-xs font-semibold text-slate-400">
              {assignedTasks.length} SOPs
            </span>
          </div>

          {assignedTasks.map((task) => {
            const progress = getTaskProgress(task);
            const status = getOperatorStatus(task);

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => openExecution(task)}
                className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.outlet} - {formatTaskDue(task.due)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getOperatorStatusClass(
                      task
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-500">Progress</span>
                    <span className="font-bold text-slate-800">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-700 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {task.execution?.reviewStatus === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{task.formTemplateId ?? "No form assigned"}</span>
                </div>
              </button>
            );
          })}
        </section>
      </div>

      <OutletTaskExecutionDrawer
        open={isExecutionOpen}
        task={selectedTask}
        form={executionForm}
        onClose={closeExecution}
        onChange={setExecutionForm}
        onCancel={cancelExecutionChanges}
        onSaveDraft={() => {
          if (selectedTask) {
            const progress = getTaskProgress(selectedTask);

            updateOutletTaskStoreItem(selectedTask.id, {
              status: "draft",
              progress,
              score: progress,
              operator: "Outlet Operator",
              submittedAt: "Saved Draft",
            });
          }

          saveExecutionDraft();
        }}
        onSubmit={submitTaskExecution}
      />
    </main>
  );
}
