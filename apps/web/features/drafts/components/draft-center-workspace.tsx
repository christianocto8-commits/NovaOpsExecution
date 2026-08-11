"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConfirmation } from "@/shared/confirmation";
import { useToast } from "@/shared/toast";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";
import {
  deleteExecutionSession,
  getExecutionSessions,
  type ExecutionSessionResponse,
} from "@/services/execution-session.service";
import { taskService } from "@/services/task.service";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { getCurrentPosition } from "@/shared/evidence";
import { createLocalId } from "@/lib/local-id";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { getAllLocalDrafts, deleteLocalDraft, enqueueMutation } from "@/lib/offline/store";
import type { LocalDraft } from "@/lib/offline/types";

type DraftCenterMode = "operational" | "content";

type OperationalDraft = {
  id: string;
  sessionId: number | null;
  taskId: string;
  title: string;
  outlet: string;
  operatorName: string;
  formName: string;
  progress: string;
  updatedAt: string;
  isLocal: boolean;
  answersJson: Record<string, unknown> | null;
  formTemplateId: string;
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

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "Baru diperbarui";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Baru diperbarui";

  return date.toLocaleString();
}

function buildOperationalDrafts(
  sessions: ExecutionSessionResponse[],
  taskTitleById: Map<string, string>,
  taskOutletById: Map<string, string>,
  formNameById: Map<string, string>,
  formFieldCountById: Map<string, number>
): OperationalDraft[] {
  return sessions
    .filter((session) => session.status === "draft" && session.task_id != null)
    .map((session) => {
      const taskId = String(session.task_id);
      const answers = session.answers_json ?? {};
      const operator = answers.operator as Record<string, unknown> | undefined;
      const responses = answers.responses as Record<string, unknown> | undefined;
      const operatorName =
        typeof operator?.name === "string" && operator.name.trim()
          ? operator.name
          : "Outlet Operator";
      const formTemplateId = session.form_template_id ? String(session.form_template_id) : "";
      const totalFields = formFieldCountById.get(formTemplateId) ?? 0;
      const answeredCount = Object.values(responses ?? {}).filter(
        (value) => typeof value === "string" && value.trim()
      ).length;

      return {
        id: `DRAFT-${session.id}`,
        sessionId: session.id,
        taskId,
        title: taskTitleById.get(taskId) ?? `Task ${taskId}`,
        outlet: taskOutletById.get(taskId) ?? "Outlet",
        operatorName,
        formName: formNameById.get(formTemplateId) ?? (formTemplateId || "No Form"),
        progress: totalFields > 0 ? `${answeredCount}/${totalFields}` : "-",
        updatedAt: formatUpdatedAt(session.submitted_at),
        isLocal: false,
        answersJson: session.answers_json ?? null,
        formTemplateId,
      };
    });
}

function buildLocalOperationalDrafts(
  drafts: LocalDraft[],
  taskTitleById: Map<string, string>,
  taskOutletById: Map<string, string>,
  taskFormTemplateById: Map<string, string>,
  formNameById: Map<string, string>,
  formFieldCountById: Map<string, number>
): OperationalDraft[] {
  return drafts.map((draft) => {
    const formTemplateId = taskFormTemplateById.get(draft.taskId) ?? "";
    const totalFields = formFieldCountById.get(formTemplateId) ?? 0;
    const answeredCount = Object.values(draft.answersJson ?? {}).filter(
      (value) => typeof value === "string" && value.trim()
    ).length;

    return {
      id: `LOCAL-DRAFT-${draft.taskId}`,
      sessionId: null,
      taskId: draft.taskId,
      title: taskTitleById.get(draft.taskId) ?? `Task ${draft.taskId}`,
      outlet: taskOutletById.get(draft.taskId) ?? "Outlet",
      operatorName: "Outlet Operator",
      formName: formNameById.get(formTemplateId) ?? (formTemplateId || "No Form"),
      progress: totalFields > 0 ? `${answeredCount}/${totalFields}` : "-",
      updatedAt: formatUpdatedAt(draft.updatedAt),
      isLocal: true,
      answersJson: draft.answersJson ?? null,
      formTemplateId,
    };
  });
}

function OperationalDraftCard({
  draft,
  onDelete,
  onSubmit,
  isSubmitting,
}: {
  draft: OperationalDraft;
  onDelete: (draft: OperationalDraft) => void;
  onSubmit: (draft: OperationalDraft) => void;
  isSubmitting?: boolean;
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
          <span className="font-semibold text-slate-800">Pelaksana:</span> {draft.operatorName}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Diperbarui:</span> {draft.updatedAt}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSubmit(draft)}
          disabled={isSubmitting}
          className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 px-4 py-3 text-sm font-bold text-white hover:from-emerald-800 hover:to-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Menyubmit..." : "Submit"}
        </button>

        <Link
          href={`/dashboard/tasks?continueDraft=${draft.taskId}`}
          className="flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
        >
          Lanjutkan
        </Link>

        <button
          type="button"
          onClick={() => onDelete(draft)}
          className="col-span-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
        >
          Hapus
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
  onDelete: (draft: ContentDraft) => void;
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
          onClick={() => onDelete(draft)}
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
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManageFormDrafts = can("form.create") || can("form.edit");
  const { isOnline } = useOnlineStatus();
  const { settings } = useSettings();
  const { syncNow } = useOfflineSync();

  const [mode, setMode] = useState<DraftCenterMode>("operational");
  const [search, setSearch] = useState("");
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  const executionDraftsQuery = useQuery({
    queryKey: ["execution-sessions", "draft-center"],
    queryFn: () => getExecutionSessions({ status: "draft", sourceType: "sop_task" }),
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });

  const templatesQuery = useQuery({
    queryKey: ["form-templates", "draft-center"],
    queryFn: formTemplateService.list,
    retry: false,
  });

  const localDraftsQuery = useQuery({
    queryKey: ["local-drafts"],
    queryFn: getAllLocalDrafts,
    staleTime: 0,
  });

  const deleteDraftMutation = useMutation({
    mutationFn: deleteExecutionSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution-sessions", "draft-center"] });
      queryClient.invalidateQueries({ queryKey: ["execution-sessions", "drafts"] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: formTemplateService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates", "draft-center"] });
    },
  });

  const operationalDrafts = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const templates = templatesQuery.data ?? [];
    const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));
    const taskOutletById = new Map(tasks.map((task) => [task.id, task.outlet]));
    const taskFormTemplateById = new Map(
      tasks.map((task) => [task.id, task.formTemplateId ?? ""] as const).filter((entry) => entry[1])
    );
    const formNameById = new Map(templates.map((template) => [template.id, template.name]));
    const formFieldCountById = new Map(
      templates.map((template) => [template.id, template.fields.length])
    );

    const serverDrafts = buildOperationalDrafts(
      executionDraftsQuery.data ?? [],
      taskTitleById,
      taskOutletById,
      formNameById,
      formFieldCountById
    );
    const localDrafts = buildLocalOperationalDrafts(
      localDraftsQuery.data ?? [],
      taskTitleById,
      taskOutletById,
      taskFormTemplateById,
      formNameById,
      formFieldCountById
    );
    const combined = [...serverDrafts, ...localDrafts];

    // When the backend task list is available, drop drafts whose task no longer
    // exists (deleted/cancelled) so the "Lanjutkan" link never points nowhere.
    if (tasksQuery.isSuccess) {
      const liveTaskIds = new Set(tasks.map((task) => task.id));
      return combined.filter((draft) => liveTaskIds.has(draft.taskId));
    }

    return combined;
  }, [executionDraftsQuery.data, localDraftsQuery.data, tasksQuery.data, templatesQuery.data]);

  const contentDrafts = useMemo<ContentDraft[]>(() => {
    return (templatesQuery.data ?? [])
      .filter((template) => template.status === "Draft")
      .map((template) => ({
        id: `FORM-DRAFT-${template.id}`,
        templateId: template.id,
        title: template.name,
        category: template.category,
        items: template.fields.length,
        description: template.description,
        updatedAt: "Recently updated",
      }));
  }, [templatesQuery.data]);

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

  async function handleDeleteOperationalDraft(draft: OperationalDraft) {
    const confirmed = await confirm({
      title: "Delete Operational Draft",
      description: `Are you sure you want to delete ${draft.title}?\n\nThe saved execution draft will be removed from this task.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    try {
      if (draft.isLocal) {
        await deleteLocalDraft(draft.taskId);
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] });
      } else {
        await deleteDraftMutation.mutateAsync(draft.sessionId as number);
      }
      toast.success("Draft eksekusi dihapus.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus draft.";
      toast.error(message);
    }
  }

  async function handleDeleteContentDraft(draft: ContentDraft) {
    const confirmed = await confirm({
      title: "Delete Form Template Draft",
      description: `Are you sure you want to delete ${draft.title}?\n\nThe draft will be removed from My Form too.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    try {
      await deleteTemplateMutation.mutateAsync(draft.templateId);
      toast.success("Draft form dihapus.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus draft form.";
      toast.error(message);
    }
  }

  async function handleSubmitOperationalDraft(draft: OperationalDraft) {
    if (!draft.answersJson) {
      toast.error("Draft tidak memiliki data jawaban untuk disubmit.");
      return;
    }

    const confirmed = await confirm({
      title: "Submit Task Draft",
      description: `Submit ${draft.title}?\n\nDraft akan dikirim sebagai eksekusi final dan task akan ditutup.`,
      confirmText: "Submit",
      cancelText: "Cancel",
      loadingText: "Menyubmit...",
    });

    if (!confirmed) return;

    const formTemplateId = draft.formTemplateId ? Number(draft.formTemplateId) : null;

    let location: { latitude: number; longitude: number; accuracy_m?: number } | null = null;
    if (settings?.geofence_enabled) {
      location = await getCurrentPosition(800, { highAccuracy: false });
      if (!location) {
        toast.error("GPS belum tersedia. Izinkan lokasi di browser untuk submit.");
        return;
      }
    }

    setSubmittingTaskId(draft.taskId);

    try {
      await enqueueMutation({
        id: createLocalId(),
        type: "EXECUTION_SUBMIT",
        taskId: draft.taskId,
        label: draft.title,
        payload: {
          task_id: Number(draft.taskId),
          form_template_id: formTemplateId,
          answers_json: draft.answersJson,
          existingSessionId: draft.sessionId ?? null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy_m: location?.accuracy_m ?? null,
        },
        createdAt: new Date().toISOString(),
        status: "pending",
      });

      if (draft.isLocal) {
        await deleteLocalDraft(draft.taskId);
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] });
      }

      if (isOnline) {
        await syncNow();
      }

      toast.success(
        isOnline
          ? "Draft berhasil disubmit."
          : "Draft masuk antrean sinkronisasi dan akan disubmit saat online."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyubmit draft.";
      toast.error(message);
    } finally {
      setSubmittingTaskId(null);
    }

    queryClient.invalidateQueries({ queryKey: ["execution-sessions", "draft-center"] });
    queryClient.invalidateQueries({ queryKey: ["execution-sessions", "drafts"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
  }

  return (
    <main className={mobileDashboardMainClass}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Draft</p>
            <h1 className="text-2xl font-semibold text-slate-950">Draft</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Lanjutkan pengerjaan task yang belum selesai.
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
              Draft Task
            </button>

            {canManageFormDrafts ? (
              <button
                type="button"
                onClick={() => setMode("content")}
                className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                  mode === "content"
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Draft Template
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            mode === "operational"
              ? "Cari task, outlet, pelaksana, atau form..."
              : "Cari draft template..."
          }
          className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-600 lg:max-w-xl"
        />
      </section>

      {mode === "operational" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-slate-950">Draft Task</h2>
            <p className="mt-1 text-sm text-slate-500">
              Draft pengerjaan task yang disimpan outlet saat belum sempat menyelesaikan semua item.
            </p>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {filteredOperationalDrafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                Belum ada draft task.
              </div>
            ) : (
              filteredOperationalDrafts.map((draft) => (
                <OperationalDraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={(item) => void handleDeleteOperationalDraft(item)}
                  onSubmit={(item) => void handleSubmitOperationalDraft(item)}
                  isSubmitting={submittingTaskId === draft.taskId}
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
                        <button
                          type="button"
                          onClick={() => void handleSubmitOperationalDraft(draft)}
                          disabled={submittingTaskId === draft.taskId}
                          className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 px-3 py-2 text-xs font-bold text-white hover:from-emerald-800 hover:to-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingTaskId === draft.taskId ? "Menyubmit..." : "Submit"}
                        </button>
                        <Link
                          href={`/dashboard/tasks?continueDraft=${draft.taskId}`}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Lanjutkan
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDeleteOperationalDraft(draft)}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredOperationalDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Belum ada draft task.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:px-5">
            Menampilkan {filteredOperationalDrafts.length} draft task
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
                  onDelete={(item) => void handleDeleteContentDraft(item)}
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
                          onClick={() => void handleDeleteContentDraft(draft)}
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
