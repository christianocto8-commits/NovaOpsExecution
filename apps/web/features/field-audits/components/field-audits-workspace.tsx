"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Play, Wrench } from "lucide-react";

import { ChecklistSubmitResultModal } from "@/features/tasks/components/checklist-submit-result-modal";
import { OutletTaskExecutionDrawer } from "@/features/tasks/components/outlet-task-execution-drawer";
import { emptyTaskExecutionForm } from "@/features/tasks/data/task-form-defaults";
import type { ChecklistScore, Task, TaskExecutionForm } from "@/features/tasks/types";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { normalizeFormCategoryId } from "@/features/forms/constants/form-categories";
import type { FormField } from "@/features/forms/types";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";
import { getIdentityOutlets } from "@/services/identity.service";
import { taskService } from "@/services/task.service";
import { scoreChecklistClientSide } from "@/shared/checklist/checklist-scoring";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { useToast } from "@/shared/toast";

type SubmitResult = {
  taskTitle: string;
  checklist: ChecklistScore;
  correctiveActionId?: string;
  isSyncing?: boolean;
};

function parseChecklist(value: unknown): ChecklistScore | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const failedItems = Array.isArray(payload.failed_items)
    ? payload.failed_items
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"
        )
        .map((item) => ({
          field_id: Number(item.field_id),
          label: typeof item.label === "string" ? item.label : "Unknown field",
          value:
            typeof item.value === "string"
              ? item.value
              : item.value == null
                ? null
                : String(item.value),
          reason: typeof item.reason === "string" ? item.reason : "Failed",
          critical: item.critical === true,
        }))
    : [];

  const status = payload.status;
  if (status !== "pass" && status !== "attention" && status !== "fail") return null;

  return {
    score: Number(payload.score ?? 0),
    passed_count: Number(payload.passed_count ?? 0),
    failed_count: Number(payload.failed_count ?? failedItems.length),
    total_scorable: Number(payload.total_scorable ?? 0),
    na_count: typeof payload.na_count === "number" ? payload.na_count : undefined,
    failed_items: failedItems,
    critical_failures: Array.isArray(payload.critical_failures)
      ? payload.critical_failures
          .filter(
            (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"
          )
          .map((item) => ({
            field_id: Number(item.field_id),
            label: typeof item.label === "string" ? item.label : "Unknown field",
            value:
              typeof item.value === "string"
                ? item.value
                : item.value == null
                  ? null
                  : String(item.value),
            reason: typeof item.reason === "string" ? item.reason : "Failed",
            critical: true,
          }))
      : undefined,
    status,
  };
}

function buildExecutionAnswers(task: Task, form: TaskExecutionForm) {
  return {
    task: {
      id: task.id,
      title: task.title,
      outlet: task.outlet,
      priority: task.priority,
      due: task.due,
      formTemplateId: task.formTemplateId ?? null,
    },
    operator: {
      name: form.operatorName,
      position: form.operatorPosition,
    },
    note: form.note,
    evidence: form.evidenceText,
    responses: form.formResponses,
    submittedAt: new Date().toISOString(),
  };
}

function statusLabel(task: Task, t: (key: string) => string) {
  const status = task.backendStatus ?? "open";
  if (status === "completed") return t("fieldAudits.statusDone");
  if (status === "in_progress") return t("fieldAudits.statusInProgress");
  return t("fieldAudits.statusOpen");
}

export function FieldAuditsWorkspace() {
  const { t } = useLanguage();
  const toast = useToast();
  const auth = useAuth();
  const { settings } = useSettings();
  const capaEnabled = isCapaEnabled(settings);
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const [outletId, setOutletId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [executionForm, setExecutionForm] = useState<TaskExecutionForm>(emptyTaskExecutionForm);
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    enabled: auth.can("outlet.read") || auth.can("task.read"),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
  });

  const auditsQuery = useQuery({
    queryKey: [...queryKeys.sop.tasks(), "field-audits"],
    queryFn: () => taskService.listFieldAudits(),
    retry: false,
  });

  const outlets = useMemo(() => {
    if (outletsQuery.data?.length) return outletsQuery.data;
    return auth.user?.outlet_access.outlets ?? [];
  }, [auth.user?.outlet_access.outlets, outletsQuery.data]);

  const auditTemplates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) =>
          template.status === "Active" && normalizeFormCategoryId(template.category) === "audit"
      ),
    [templatesQuery.data]
  );

  const recentAudits = useMemo(
    () => filterTasksForWorkspace(auditsQuery.data ?? [], workspace).slice(0, 30),
    [auditsQuery.data, workspace]
  );

  const resolvedOutletId = outletId || outlets[0]?.id || "";
  const resolvedTemplateId = templateId || auditTemplates[0]?.id || "";

  const startMutation = useMutation({
    mutationFn: async () => {
      const template = auditTemplates.find((item) => item.id === resolvedTemplateId);
      const outlet = outlets.find((item) => item.id === resolvedOutletId);
      if (!template || !outlet) {
        throw new Error(t("fieldAudits.startErrorMissing"));
      }

      return taskService.createFieldAudit({
        title: `${template.name} · ${outlet.name}`,
        outletId: outlet.id,
        formTemplateId: template.id,
        description: template.description || t("fieldAudits.defaultDescription"),
        priority: "High",
      });
    },
    onSuccess: async (task) => {
      setSelectedTask(task);
      setExecutionForm(emptyTaskExecutionForm);
      setIsExecutionOpen(true);
      toast.success(t("fieldAudits.started"));
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "field-audits"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("fieldAudits.startError"));
    },
  });

  function openAudit(task: Task) {
    setSelectedTask(task);
    setExecutionForm(task.executionDraft ?? emptyTaskExecutionForm);
    setIsExecutionOpen(true);
  }

  function closeExecution() {
    setIsExecutionOpen(false);
    setSelectedTask(null);
    setExecutionForm(emptyTaskExecutionForm);
  }

  async function submitExecution(
    knownLocation?: { latitude: number; longitude: number; accuracy_m?: number } | null,
    templateFields?: FormField[]
  ) {
    if (!selectedTask) return;

    const answersJson = buildExecutionAnswers(selectedTask, executionForm);
    const previewChecklist = templateFields?.length
      ? scoreChecklistClientSide({
          fields: templateFields,
          responses: executionForm.formResponses,
          passThreshold: settings?.pass_threshold,
        })
      : null;

    const taskSnapshot = selectedTask;
    closeExecution();

    if (previewChecklist) {
      setSubmitResult({
        taskTitle: taskSnapshot.title,
        checklist: previewChecklist,
        isSyncing: true,
      });
    }

    try {
      const result = await taskService.submitExecution(taskSnapshot.id, {
        form_template_id: Number(taskSnapshot.formTemplateId) || null,
        answers_json: answersJson,
        latitude: knownLocation?.latitude ?? null,
        longitude: knownLocation?.longitude ?? null,
        accuracy_m: knownLocation?.accuracy_m ?? null,
      });

      const checklist = parseChecklist(result.checklist) ?? previewChecklist;
      if (checklist) {
        setSubmitResult({
          taskTitle: taskSnapshot.title,
          checklist,
          correctiveActionId: result.correctiveTask?.id,
          isSyncing: false,
        });
      } else {
        setSubmitResult(null);
        toast.success(t("fieldAudits.submitSuccess"));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "field-audits"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.sop.tasks(), "corrective-actions"],
        }),
      ]);
    } catch (error) {
      setSubmitResult(null);
      toast.error(error instanceof Error ? error.message : t("fieldAudits.submitError"));
      setSelectedTask(taskSnapshot);
      setExecutionForm(executionForm);
      setIsExecutionOpen(true);
    }
  }

  const openCount = recentAudits.filter((task) => task.backendStatus !== "completed").length;
  const doneCount = recentAudits.filter((task) => task.backendStatus === "completed").length;

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("fieldAudits.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("fieldAudits.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("fieldAudits.subtitle")}</p>
      </div>

      {!capaEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("fieldAudits.capaOffTitle")}</p>
          <p className="mt-1 text-amber-800">{t("fieldAudits.capaOffBody")}</p>
          <Link href="/dashboard/settings" className="mt-3 inline-flex text-sm font-bold underline">
            Settings
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ClipboardList className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-950">
              {t("fieldAudits.startTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{t("fieldAudits.startBody")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">{t("fieldAudits.outlet")}</span>
            <select
              value={resolvedOutletId}
              onChange={(event) => setOutletId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {outlets.length === 0 ? (
                <option value="">{t("fieldAudits.noOutlets")}</option>
              ) : (
                outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              {t("fieldAudits.template")}
            </span>
            <select
              value={resolvedTemplateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {auditTemplates.length === 0 ? (
                <option value="">{t("fieldAudits.noTemplates")}</option>
              ) : (
                auditTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={
            startMutation.isPending ||
            !resolvedOutletId ||
            !resolvedTemplateId ||
            outlets.length === 0
          }
          onClick={() => startMutation.mutate()}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Play className="size-4" />
          {startMutation.isPending ? t("fieldAudits.starting") : t("fieldAudits.startCta")}
        </button>

        {auditTemplates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {t("fieldAudits.templateHint")}{" "}
            <Link href="/dashboard/forms" className="font-semibold text-emerald-700 underline">
              Forms
            </Link>
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t("fieldAudits.openAudits")}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t("fieldAudits.doneAudits")}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{doneCount}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">{t("fieldAudits.recentTitle")}</h2>
          <Link
            href="/dashboard/corrective-actions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"
          >
            <Wrench className="size-3.5" />
            {t("fieldAudits.viewCapa")}
          </Link>
        </div>

        {auditsQuery.isLoading ? (
          <p className="text-sm text-slate-500">{t("fieldAudits.loading")}</p>
        ) : null}

        {auditsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {auditsQuery.error instanceof Error
              ? auditsQuery.error.message
              : t("fieldAudits.loadError")}
          </div>
        ) : null}

        {!auditsQuery.isLoading && recentAudits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">{t("fieldAudits.emptyTitle")}</p>
            <p className="mt-1">{t("fieldAudits.emptyBody")}</p>
          </div>
        ) : null}

        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {recentAudits.map((task) => {
            const isOpen = task.backendStatus !== "completed";
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {task.outlet} · {statusLabel(task, t)}
                    {task.formTemplateName ? ` · ${task.formTemplateName}` : ""}
                  </p>
                </div>
                {isOpen ? (
                  <button
                    type="button"
                    onClick={() => openAudit(task)}
                    className="shrink-0 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    {t("fieldAudits.continue")}
                  </button>
                ) : (
                  <Link
                    href="/dashboard/corrective-actions"
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {t("fieldAudits.viewCapa")}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <OutletTaskExecutionDrawer
        open={isExecutionOpen}
        task={selectedTask}
        form={executionForm}
        onClose={closeExecution}
        onChange={setExecutionForm}
        onCancel={closeExecution}
        onSaveDraft={async () => {
          toast.info(t("fieldAudits.draftHint"));
        }}
        onSubmit={submitExecution}
      />

      <ChecklistSubmitResultModal
        open={Boolean(submitResult)}
        taskTitle={submitResult?.taskTitle ?? ""}
        checklist={submitResult?.checklist ?? null}
        correctiveActionId={submitResult?.correctiveActionId}
        isSyncing={submitResult?.isSyncing}
        capaEnabled={capaEnabled}
        onClose={() => setSubmitResult(null)}
      />
    </main>
  );
}
