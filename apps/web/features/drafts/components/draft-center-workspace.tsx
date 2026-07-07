"use client";

import { useMemo, useState } from "react";

import { getFormTemplate } from "@/features/forms/data/mock-form-templates";
import { useConfirmation } from "@/shared/confirmation";
import { Task } from "@/features/tasks/types";

const TASK_STORAGE_KEY = "novaops_tasks_mock";

type DraftCenterMode = "operational" | "content";

type OperationalDraft = {
  id: string;
  taskId: string;
  title: string;
  outlet: string;
  operatorName: string;
  formName: string;
  progress: string;
  updatedAt: string;
};

function loadTaskDrafts(): OperationalDraft[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(TASK_STORAGE_KEY);

  if (!raw) return [];

  try {
    const tasks = JSON.parse(raw) as Task[];

    return tasks
      .filter((task) => Boolean(task.executionDraft))
      .map((task) => {
        const template = getFormTemplate(task.formTemplateId);
        const responses = task.executionDraft?.formResponses ?? {};
        const answeredCount = Object.values(responses).filter((value) => value.trim()).length;
        const totalFields = template?.fields.length ?? 0;

        return {
          id: `DRAFT-${task.id}`,
          taskId: task.id,
          title: task.title,
          outlet: task.outlet,
          operatorName: task.executionDraft?.operatorName || "Outlet Operator",
          formName: template?.name ?? task.formTemplateId ?? "No Form",
          progress: totalFields > 0 ? `${answeredCount}/${totalFields}` : "-",
          updatedAt: "Just now",
        };
      });
  } catch {
    return [];
  }
}

export function DraftCenterWorkspace() {
  const confirm = useConfirmation();

  const [mode, setMode] = useState<DraftCenterMode>("operational");
  const [search, setSearch] = useState("");

  const [operationalDrafts, setOperationalDrafts] = useState<OperationalDraft[]>(loadTaskDrafts);
  const filteredOperationalDrafts = useMemo(() => {
    const keyword = search.toLowerCase();

    return operationalDrafts.filter((draft) => {
      return (
        draft.title.toLowerCase().includes(keyword) ||
        draft.outlet.toLowerCase().includes(keyword) ||
        draft.operatorName.toLowerCase().includes(keyword) ||
        draft.formName.toLowerCase().includes(keyword)
      );
    });
  }, [operationalDrafts, search]);

  async function handleDeleteOperationalDraft(draftId: string) {
    const draft = operationalDrafts.find((item) => item.id === draftId);

    const confirmed = await confirm({
      title: "Delete Operational Draft",
      description: `Are you sure you want to delete ${
        draft?.title ?? "this operational draft"
      }?\n\nThe saved execution draft will be removed from this task.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed || !draft) return;

    const raw = window.localStorage.getItem(TASK_STORAGE_KEY);

    if (raw) {
      try {
        const tasks = JSON.parse(raw) as Task[];

        const nextTasks = tasks.map((task) =>
          task.id === draft.taskId
            ? {
                ...task,
                executionDraft: undefined,
              }
            : task
        );

        window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(nextTasks));
      } catch {
        // Keep UI stable if local storage contains invalid task data.
      }
    }

    setOperationalDrafts((current) => current.filter((item) => item.id !== draftId));
  }


  return (
    <main className="space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Draft Center</p>
            <h1 className="text-2xl font-semibold text-slate-950">Enterprise Draft Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage operational execution drafts and content drafts separately.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("operational")}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                mode === "operational"
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Operational Drafts
            </button>

            <button
              type="button"
              onClick={() => setMode("content")}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                mode === "content"
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Content Drafts
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            mode === "operational"
              ? "Search task drafts, outlets, operators, forms..."
              : "Search content drafts..."
          }
          className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-600 lg:max-w-xl"
        />
      </section>

      {mode === "operational" ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">Operational Drafts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Execution drafts saved by outlet users from task forms.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Task Draft</th>
                  <th className="px-5 py-3 font-medium">Form</th>
                  <th className="px-5 py-3 font-medium">Outlet</th>
                  <th className="px-5 py-3 font-medium">Operator</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOperationalDrafts.map((draft) => (
                  <tr key={draft.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{draft.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{draft.taskId}</p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">{draft.formName}</td>

                    <td className="px-5 py-4 text-slate-600">{draft.outlet}</td>

                    <td className="px-5 py-4 text-slate-600">{draft.operatorName}</td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {draft.progress}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">{draft.updatedAt}</td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/dashboard/tasks?mode=outlet&continueDraft=${draft.taskId}`}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Continue
                        </a>

                        <button
                          type="button"
                          onClick={() => void handleDeleteOperationalDraft(draft.id)}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredOperationalDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      No operational drafts found. Save a task execution draft from Outlet Mode
                      first.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            Showing {filteredOperationalDrafts.length} operational drafts
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Content Drafts</h2>
          <p className="mt-2 text-sm text-slate-500">
            SOP, policy, form template, and announcement drafts will stay here.
          </p>
        </section>
      )}
    </main>
  );
}

