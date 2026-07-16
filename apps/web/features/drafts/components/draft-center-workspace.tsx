"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getFormTemplate } from "@/features/forms/data/mock-form-templates";
import {
  readStoredFormTemplates,
  writeStoredFormTemplates,
} from "@/features/forms/data/form-template-storage";
import { FormTemplate } from "@/features/forms/types";
import { Task } from "@/features/tasks/types";
import { useConfirmation } from "@/shared/confirmation";

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

type ContentDraft = {
  id: string;
  templateId: string;
  title: string;
  category: string;
  items: number;
  description: string;
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

function loadContentDrafts(): ContentDraft[] {
  return readStoredFormTemplates()
    .filter((template) => template.status === "Draft")
    .map((template) => ({
      id: `FORM-DRAFT-${template.id}`,
      templateId: template.id,
      title: template.name,
      category: template.category,
      items: template.fields.length,
      description: template.description,
      updatedAt: "Just now",
    }));
}

function OperationalDraftCard({
  draft,
  onDelete,
}: {
  draft: OperationalDraft;
  onDelete: (draftId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-950">{draft.title}</p>
          <p className="mt-1 text-sm text-slate-500">{draft.outlet}</p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {draft.progress}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Form:</span> {draft.formName}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Operator:</span> {draft.operatorName}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Updated:</span> {draft.updatedAt}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href={`/dashboard/tasks?continueDraft=${draft.taskId}`}
          className="flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Continue
        </Link>

        <button
          type="button"
          onClick={() => onDelete(draft.id)}
          className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function ContentDraftCard({
  draft,
  onDelete,
}: {
  draft: ContentDraft;
  onDelete: (draftId: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-950">{draft.title}</p>
          <p className="mt-1 text-sm text-slate-500">{draft.description}</p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {draft.items} items
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Type:</span> {draft.category}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Updated:</span> {draft.updatedAt}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/forms"
          className="flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Open
        </Link>

        <button
          type="button"
          onClick={() => onDelete(draft.id)}
          className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export function DraftCenterWorkspace() {
  const confirm = useConfirmation();

  const [mode, setMode] = useState<DraftCenterMode>("operational");
  const [search, setSearch] = useState("");

  const [operationalDrafts, setOperationalDrafts] = useState<OperationalDraft[]>(loadTaskDrafts);
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>(loadContentDrafts);

  useEffect(() => {
    const syncDrafts = () => {
      setOperationalDrafts(loadTaskDrafts());
      setContentDrafts(loadContentDrafts());
    };

    syncDrafts();
    window.addEventListener("storage", syncDrafts);
    window.addEventListener("focus", syncDrafts);
    window.addEventListener("visibilitychange", syncDrafts);

    return () => {
      window.removeEventListener("storage", syncDrafts);
      window.removeEventListener("focus", syncDrafts);
      window.removeEventListener("visibilitychange", syncDrafts);
    };
  }, []);

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

  const filteredContentDrafts = useMemo(() => {
    const keyword = search.toLowerCase();

    return contentDrafts.filter((draft) => {
      return (
        draft.title.toLowerCase().includes(keyword) ||
        draft.category.toLowerCase().includes(keyword) ||
        draft.description.toLowerCase().includes(keyword)
      );
    });
  }, [contentDrafts, search]);

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

  async function handleDeleteContentDraft(draftId: string) {
    const draft = contentDrafts.find((item) => item.id === draftId);

    const confirmed = await confirm({
      title: "Delete Form Template Draft",
      description: `Are you sure you want to delete ${
        draft?.title ?? "this form template draft"
      }?\n\nThe draft will be removed from My Form too.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed || !draft) return;

    const nextTemplates: FormTemplate[] = readStoredFormTemplates().filter(
      (template) => template.id !== draft.templateId
    );

    writeStoredFormTemplates(nextTemplates);
    setContentDrafts((current) => current.filter((item) => item.id !== draftId));
  }

  return (
    <main className="space-y-5 px-4 py-4 sm:space-y-6 sm:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Draft</p>
            <h1 className="text-2xl font-semibold text-slate-950">Draft Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Continue saved task drafts and manage form drafts from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setMode("operational")}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                mode === "operational"
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Task Drafts
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
              Form Drafts
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            mode === "operational"
              ? "Search task drafts, outlets, operators, forms..."
              : "Search form drafts..."
          }
          className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-600 lg:max-w-xl"
        />
      </section>

      {mode === "operational" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-slate-950">Task Drafts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Draft pengerjaan task yang disimpan outlet saat belum sempat menyelesaikan semua item.
            </p>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {filteredOperationalDrafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No task drafts found yet.
              </div>
            ) : (
              filteredOperationalDrafts.map((draft) => (
                <OperationalDraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={(draftId) => void handleDeleteOperationalDraft(draftId)}
                />
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
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
                        <Link
                          href={`/dashboard/tasks?continueDraft=${draft.taskId}`}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Continue
                        </Link>
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
                      No task drafts found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:px-5">
            Showing {filteredOperationalDrafts.length} task drafts
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-slate-950">Form Drafts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Draft template form yang disimpan dari My Form sebelum dipakai di task.
            </p>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {filteredContentDrafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No form drafts found yet.
              </div>
            ) : (
              filteredContentDrafts.map((draft) => (
                <ContentDraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={(draftId) => void handleDeleteContentDraft(draftId)}
                />
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Form Template Draft</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredContentDrafts.map((draft) => (
                  <tr key={draft.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{draft.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{draft.description}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{draft.category}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {draft.items} items
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{draft.updatedAt}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href="/dashboard/forms"
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDeleteContentDraft(draft.id)}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredContentDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      No form drafts found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:px-5">
            Showing {filteredContentDrafts.length} form drafts
          </div>
        </section>
      )}
    </main>
  );
}

