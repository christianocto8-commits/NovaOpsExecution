"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { emptyTaskExecutionForm, emptyTaskForm } from "@/features/tasks/data/task-form-defaults";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useConfirmation } from "@/shared/confirmation";
import { useToast } from "@/shared/toast";
import {
  Task,
  TaskExecution,
  TaskExecutionForm,
  TaskFormState,
  ChecklistScore,
} from "@/features/tasks/types";
import type { FormField } from "@/features/forms/types";
import { createTaskEvidence, detectEvidenceType } from "@/shared/files";
import { EvidenceItem, getCurrentPosition } from "@/shared/evidence";
import { parsePhotoFieldValues } from "@/shared/evidence/photo-value";
import { queryKeys } from "@/lib/query/keys";
import { createLocalId } from "@/lib/local-id";
import { enrichTaskFormOutlets } from "@/features/tasks/utils/enrich-task-form-outlets";
import { resolveAssigneeSelection } from "@/features/tasks/utils/assignee-options";
import { isTaskExpiredOverdue } from "@/features/tasks/utils/task-inbox";
import {
  taskService,
  hasValidTaskFormTemplate,
  resolveTaskFormTemplate,
} from "@/services/task.service";
import { formTemplateService } from "@/services/form-template.service";
import { scoreChecklistClientSide } from "@/shared/checklist/checklist-scoring";
import { getIdentityOutlets } from "@/services/identity.service";
import {
  createExecutionSession,
  deleteExecutionSession,
  getExecutionSessions,
  updateExecutionSession,
  type ExecutionSessionResponse,
} from "@/services/execution-session.service";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import {
  enqueueMutation,
  getAllLocalDrafts,
  saveLocalDraft,
  deleteLocalDraft,
  updateCachedTask,
} from "@/lib/offline/store";
import type { LocalDraft } from "@/lib/offline/types";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

const EXECUTION_DRAFT_QUERY_KEY = ["execution-sessions", "drafts"] as const;

function getTimeFromDue(value?: string, fallback = "09:00") {
  if (!value) return fallback;

  const timeMatch = value.match(/(\d{2}):(\d{2})/);

  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : fallback;
}

function getLocalDateTimeValue(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  date.setSeconds(0, 0);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isTaskPastDue(task: Task) {
  if (!task.due) return false;
  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function normalizeTask(task: Task): Task {
  const recurrence = task.recurrence ?? "once";

  return {
    ...task,
    formTemplateId: task.formTemplateId ?? "",
    recurrence,
    shifts: [],
    targetOutlets: task.targetOutlets ?? [task.outlet],
    autoPublish: task.autoPublish ?? false,
    publishTime: task.publishTime,
    dueTime: task.dueTime ?? getTimeFromDue(task.due),
    weeklyPublishDay: task.weeklyPublishDay ?? "sunday",
  };
}

function isBackendTaskId(id: string) {
  return /^\d+$/.test(id);
}

function getNumericFormTemplateId(formTemplateId?: string) {
  if (!formTemplateId) return null;

  const numericId = Number(formTemplateId);

  return Number.isFinite(numericId) ? numericId : null;
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

function parseExecutionDraft(session: ExecutionSessionResponse): TaskExecutionForm | null {
  const payload = session.answers_json;

  if (!payload || typeof payload !== "object") return null;

  const operator = payload.operator as Record<string, unknown> | undefined;
  const responses = payload.responses as Record<string, unknown> | undefined;

  return {
    operatorName: typeof operator?.name === "string" ? operator.name : "",
    operatorPosition:
      typeof operator?.position === "string"
        ? (operator.position as TaskExecutionForm["operatorPosition"])
        : "Crew",
    note: typeof payload.note === "string" ? payload.note : "",
    evidenceText: typeof payload.evidence === "string" ? payload.evidence : "",
    formResponses: Object.fromEntries(
      Object.entries(responses ?? {}).map(([key, value]) => [
        key,
        typeof value === "string" ? value : "",
      ])
    ),
  };
}

function getLatestDraftSessionsByTask(executionSessions: ExecutionSessionResponse[]) {
  const latestDraftMap = new Map<string, ExecutionSessionResponse>();

  executionSessions.forEach((session) => {
    if (
      session.status !== "draft" ||
      session.source_type !== "sop_task" ||
      session.task_id == null
    ) {
      return;
    }

    const taskId = String(session.task_id);
    const current = latestDraftMap.get(taskId);

    if (!current || session.id > current.id) {
      latestDraftMap.set(taskId, session);
    }
  });

  return latestDraftMap;
}

function getLatestCompletedSessionsByTask(executionSessions: ExecutionSessionResponse[]) {
  const latestCompletedMap = new Map<string, ExecutionSessionResponse>();

  executionSessions.forEach((session) => {
    if (
      session.status !== "completed" ||
      session.source_type !== "sop_task" ||
      session.task_id == null
    ) {
      return;
    }

    const taskId = String(session.task_id);
    const current = latestCompletedMap.get(taskId);

    if (!current || session.id > current.id) {
      latestCompletedMap.set(taskId, session);
    }
  });

  return latestCompletedMap;
}

function parseEvidenceGallery(value: string): EvidenceItem[] {
  if (!value.trim()) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is EvidenceItem =>
        Boolean(item) && typeof item.id === "string" && typeof item.url === "string"
    );
  } catch {
    return [];
  }
}

function isPhotoUrl(url: string) {
  if (url.startsWith("offline://")) {
    return true;
  }
  return /uploads\/evidence|evidence-uploads|\.(jpg|jpeg|png|webp|heic)/i.test(url);
}

function hasPhotoInFormResponses(formResponses: TaskExecutionForm["formResponses"]) {
  return Object.values(formResponses).some((value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return false;

    const photoValues = parsePhotoFieldValues(trimmed);
    if (photoValues.some((photo) => photo.url && isPhotoUrl(photo.url))) return true;

    return isPhotoUrl(trimmed);
  });
}

function hasPhotoEvidence(evidenceText: string, formResponses: TaskExecutionForm["formResponses"]) {
  const galleryItems = parseEvidenceGallery(evidenceText);
  if (galleryItems.some((item) => isPhotoUrl(item.url))) return true;

  return hasPhotoInFormResponses(formResponses);
}

function hasAnyFormResponse(formResponses: TaskExecutionForm["formResponses"]) {
  return Object.values(formResponses).some((value) => String(value ?? "").trim().length > 0);
}

function hasSignatureEvidence(
  evidenceText: string,
  formResponses: TaskExecutionForm["formResponses"],
  templateFields?: FormField[]
) {
  const signatureFieldIds = new Set(
    (templateFields ?? []).filter((field) => field.type === "signature").map((field) => field.id)
  );

  const hasFilledSignatureField = Object.entries(formResponses).some(([fieldId, value]) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return false;

    if (signatureFieldIds.size > 0) {
      return signatureFieldIds.has(fieldId);
    }

    return /signature|data:image/i.test(trimmed) || trimmed.startsWith("offline://");
  });

  if (hasFilledSignatureField) return true;

  const galleryItems = parseEvidenceGallery(evidenceText);
  return galleryItems.some((item) => /signature|data:image/i.test(item.url));
}

function validateExecutionSubmit(
  form: TaskExecutionForm,
  settings?: {
    photo_required_by_default?: boolean;
    evidence_required?: boolean;
    signature_required_by_default?: boolean;
  } | null,
  templateFields?: FormField[]
) {
  if (
    settings?.photo_required_by_default &&
    !hasPhotoEvidence(form.evidenceText, form.formResponses)
  ) {
    return "Bukti foto wajib diunggah.";
  }

  if (settings?.evidence_required) {
    const hasEvidence =
      Boolean(form.note.trim()) ||
      Boolean(form.evidenceText.trim()) ||
      hasAnyFormResponse(form.formResponses);
    if (!hasEvidence) {
      return "Evidence atau catatan wajib diisi.";
    }
  }

  if (
    settings?.signature_required_by_default &&
    !hasSignatureEvidence(form.evidenceText, form.formResponses, templateFields)
  ) {
    return "Tanda tangan wajib diisi.";
  }

  return null;
}

function buildTaskEvidence(value: string, submittedAt: string) {
  const galleryItems = parseEvidenceGallery(value);

  if (galleryItems.length > 0) {
    return galleryItems.map((item) =>
      createTaskEvidence({
        type: detectEvidenceType(item.url),
        label: item.caption || "Outlet Evidence",
        value: item.url,
        submittedAt: item.uploadedAt ?? submittedAt,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy_m: item.accuracy_m,
      })
    );
  }

  return [
    createTaskEvidence({
      type: value ? detectEvidenceType(value) : "note",
      label: value ? "Outlet Evidence" : "Execution Confirmation",
      value: value || "Execution completed without additional evidence attachment.",
      submittedAt,
    }),
  ];
}

function parseSubmitChecklist(value: unknown): ChecklistScore | null {
  const parsed = parseChecklistScore(value);
  return parsed ?? null;
}

function parseChecklistScore(value: unknown): TaskExecution["checklist"] | undefined {
  if (!value || typeof value !== "object") return undefined;

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

  const criticalFailures = Array.isArray(payload.critical_failures)
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
    : failedItems.filter((item) => item.critical);

  const status = payload.status;
  if (status !== "pass" && status !== "attention" && status !== "fail") {
    return undefined;
  }

  return {
    score: typeof payload.score === "number" ? payload.score : Number(payload.score ?? 0),
    passed_count: typeof payload.passed_count === "number" ? payload.passed_count : 0,
    failed_count:
      typeof payload.failed_count === "number" ? payload.failed_count : failedItems.length,
    total_scorable: typeof payload.total_scorable === "number" ? payload.total_scorable : 0,
    na_count: typeof payload.na_count === "number" ? payload.na_count : 0,
    failed_items: failedItems,
    critical_failures: criticalFailures,
    status,
  };
}

function parseExecutionSession(session: ExecutionSessionResponse): TaskExecution | null {
  const payload = session.answers_json;

  if (!payload || typeof payload !== "object") return null;

  const operator = payload.operator as Record<string, unknown> | undefined;
  const responses = payload.responses as Record<string, unknown> | undefined;
  const submittedAt =
    typeof payload.submittedAt === "string"
      ? payload.submittedAt
      : (session.submitted_at ?? new Date().toISOString());
  const evidenceText = typeof payload.evidence === "string" ? payload.evidence : "";

  return {
    operatorName: typeof operator?.name === "string" ? operator.name : "",
    operatorPosition:
      typeof operator?.position === "string"
        ? (operator.position as TaskExecutionForm["operatorPosition"])
        : "Crew",
    note: typeof payload.note === "string" ? payload.note : "",
    evidence: buildTaskEvidence(evidenceText, submittedAt),
    formResponses: Object.fromEntries(
      Object.entries(responses ?? {}).map(([key, value]) => [
        key,
        typeof value === "string" ? value : "",
      ])
    ),
    completedAt: submittedAt,
    checklist: parseChecklistScore(payload._checklist),
  };
}

function mergeBackendTasksWithDrafts(
  backendTasks: Task[],
  executionSessions: ExecutionSessionResponse[]
) {
  const latestDraftMap = getLatestDraftSessionsByTask(executionSessions);
  const latestCompletedMap = getLatestCompletedSessionsByTask(executionSessions);

  return backendTasks.map((task) => {
    const normalizedTask = normalizeTask(task);

    if (normalizedTask.execution?.reviewStatus === "approved") {
      return normalizedTask;
    }

    const completedSession = latestCompletedMap.get(task.id);
    const parsedExecution = completedSession ? parseExecutionSession(completedSession) : null;

    if (parsedExecution) {
      const reviewStatus =
        normalizedTask.execution?.reviewStatus ??
        (normalizedTask.approvedAt
          ? "approved"
          : normalizedTask.backendStatus === "completed"
            ? "pending_review"
            : undefined);
      const completedFromSession = Boolean(parsedExecution.completedAt);
      const nextStatus: Task["status"] =
        normalizedTask.status === "Completed" ||
        normalizedTask.backendStatus === "completed" ||
        completedFromSession
          ? "Completed"
          : normalizedTask.status;

      return normalizeTask({
        ...normalizedTask,
        status: nextStatus,
        execution: {
          ...(normalizedTask.execution ?? parsedExecution),
          ...parsedExecution,
          reviewStatus,
        },
        executionDraft: undefined,
      });
    }

    if (normalizedTask.status === "Completed") {
      return normalizedTask;
    }

    const draftSession = latestDraftMap.get(task.id);
    const backendDraft = draftSession ? parseExecutionDraft(draftSession) : null;

    if (!backendDraft) {
      return normalizedTask;
    }

    return normalizeTask({
      ...normalizedTask,
      status: "In Progress",
      executionDraft: backendDraft,
    });
  });
}

function mergeTasksWithLocalDrafts(
  tasks: Task[],
  localDrafts: LocalDraft[],
  executionSessions: ExecutionSessionResponse[]
) {
  const mergedTasks = mergeBackendTasksWithDrafts(tasks, executionSessions);
  const localDraftMap = new Map(localDrafts.map((draft) => [draft.taskId, draft]));

  return mergedTasks.map((task) => {
    if (task.execution?.reviewStatus === "approved" || task.status === "Completed") {
      return task;
    }

    const localDraft = localDraftMap.get(task.id);

    if (!localDraft) {
      return task;
    }

    return normalizeTask({
      ...task,
      status: "In Progress",
      executionDraft: localDraft.form,
    });
  });
}

export function useTaskWorkspace() {
  const { settings } = useSettings();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const defaultTaskDueTime = settings?.default_task_due_time ?? "09:00";
  const isOutletWorkspace = workspace.mode === "outlet";
  const approvalRequired = isOutletWorkspace ? false : (settings?.approval_required ?? false);
  const confirm = useConfirmation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const { refreshPendingCount, pendingSyncCount } = useOfflineSync();

  const backendTasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });

  const executionSessionsQuery = useQuery({
    queryKey: EXECUTION_DRAFT_QUERY_KEY,
    queryFn: () => getExecutionSessions({ sourceType: "sop_task" }),
    retry: false,
    enabled: isOnline,
  });

  const localDraftsQuery = useQuery({
    queryKey: ["local-drafts"],
    queryFn: getAllLocalDrafts,
    staleTime: 0,
  });

  const backendConnected = backendTasksQuery.isSuccess;

  const createTaskMutation = useMutation({
    mutationFn: taskService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, form }: { taskId: string; form: TaskFormState }) =>
      taskService.update(taskId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      taskService.remove(taskId, { resolveOutletFromTask: true }),
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sop.tasks() });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.sop.tasks());

      queryClient.setQueryData<Task[]>(queryKeys.sop.tasks(), (currentTasks) =>
        (currentTasks ?? []).filter((task) => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.sop.tasks(), context.previousTasks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({
      task,
      form,
      location,
    }: {
      task: Task;
      form: TaskExecutionForm;
      location?: { latitude: number; longitude: number; accuracy_m?: number } | null;
    }) => {
      return taskService.submitExecution(task.id, {
        form_template_id: getNumericFormTemplateId(task.formTemplateId),
        answers_json: buildExecutionAnswers(task, form),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracy_m: location?.accuracy_m ?? null,
      });
    },
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    taskTitle: string;
    checklist: ChecklistScore;
    pendingSync?: boolean;
    isSyncing?: boolean;
    correctiveActionId?: string;
  } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [executionForm, setExecutionForm] = useState<TaskExecutionForm>(emptyTaskExecutionForm);

  const draftSessions = executionSessionsQuery.data ?? [];
  const localDrafts = localDraftsQuery.data ?? [];
  const latestDraftSessionMap = useMemo(
    () => getLatestDraftSessionsByTask(draftSessions),
    [draftSessions]
  );

  const tasks = useMemo(() => {
    if (!backendTasksQuery.data) return [];

    return mergeTasksWithLocalDrafts(backendTasksQuery.data, localDrafts, draftSessions);
  }, [backendTasksQuery.data, localDrafts, draftSessions]);

  const taskSummary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task: Task) => task.status === "Pending").length,
      inProgress: tasks.filter((task: Task) => task.status === "In Progress").length,
      blocked: tasks.filter((task: Task) => task.status === "Blocked").length,
      completed: tasks.filter((task: Task) => task.status === "Completed").length,
    };
  }, [tasks]);

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm({
      ...emptyTaskForm,
      recurrence: "once",
      autoPublish: false,
      assignee: "Outlet Team",
      assigneeSelection: "outlet_team",
      assignedToId: null,
      publishAt: getLocalDateTimeValue(),
      due: getLocalDateTimeValue(24 * 60),
      publishTime: defaultTaskDueTime,
      dueTime: "17:00",
      shifts: [],
    });
    setIsFormOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      outlet: task.outlet,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      assignedToId: task.assignedToId ?? null,
      assigneeSelection: resolveAssigneeSelection({
        assignedToId: task.assignedToId,
        assignee: task.assignee,
      }),
      due: task.due,
      publishAt: task.publishAt ?? "",
      description: task.description,
      formTemplateId: task.formTemplateId ?? "",
      recurrence: "once",
      shifts: [],
      targetOutlets: task.targetOutlets ?? [task.outlet],
      targetOutletIds: task.targetOutletIds ?? (task.outletId ? [task.outletId] : []),
      outletId: task.outletId,
      autoPublish: false,
      publishTime: task.publishTime ?? defaultTaskDueTime,
      dueTime: task.dueTime ?? "17:00",
      weeklyPublishDay: task.weeklyPublishDay ?? "sunday",
      monthlyPublishDay: task.monthlyPublishDay ?? 1,
    });
    setIsFormOpen(true);
  }

  function closeTaskForm() {
    setIsFormOpen(false);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
  }

  async function submitTaskForm() {
    let outlets =
      queryClient.getQueryData<Awaited<ReturnType<typeof getIdentityOutlets>>>(
        queryKeys.identity.outlets
      ) ?? [];

    if (outlets.length === 0) {
      try {
        outlets = await getIdentityOutlets();
      } catch {
        outlets = [];
      }
    }

    const readyForm = enrichTaskFormOutlets(
      taskForm,
      outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))
    );

    let templates: Awaited<ReturnType<typeof formTemplateService.list>> = [];
    try {
      templates = await formTemplateService.list();
    } catch {
      templates = [];
    }

    const activeTemplateIds = templates
      .filter((template) => template.status === "Active")
      .map((template) => template.id);
    const resolvedForm = resolveTaskFormTemplate(readyForm, activeTemplateIds);

    if (!hasValidTaskFormTemplate(resolvedForm.formTemplateId)) {
      toast.error(
        "Form template belum dipilih. Buat dan publish form checklist di menu Forms, lalu pilih template Active saat membuat task."
      );
      return;
    }

    if (resolvedForm.recurrence !== "once") {
      toast.error(
        "SOP recurring dibuat dari menu Schedules. Di Tasks hanya untuk task sekali jalan."
      );
      return;
    }

    if (resolvedForm.recurrence === "once" && !resolvedForm.outletId) {
      toast.error(
        "Outlet belum dipilih. Buat outlet di menu Outlets terlebih dahulu, lalu coba lagi."
      );
      return;
    }

    try {
      if (!backendConnected) {
        toast.info("Menyambungkan ke backend, tunggu sebentar...");
        await queryClient.fetchQuery({
          queryKey: queryKeys.sop.tasks(),
          queryFn: taskService.listAll,
        });
      }

      if (editingTaskId && isBackendTaskId(editingTaskId)) {
        await updateTaskMutation.mutateAsync({ taskId: editingTaskId, form: resolvedForm });
        toast.success("Task berhasil diperbarui.");
      } else {
        await createTaskMutation.mutateAsync({ ...resolvedForm, recurrence: "once" });
        toast.success("Task sekali jalan berhasil dibuat dan masuk ke outlet.");
      }

      closeTaskForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan task.";
      toast.error(message);
    }
  }

  function openTaskDetail(task: Task) {
    setSelectedTask(task);
  }

  function closeDetail() {
    setSelectedTask(null);
  }

  async function deleteTask(id: string) {
    const task = tasks.find((item: Task) => item.id === id);

    const confirmed = await confirm({
      title: "Delete Task",
      description: `Are you sure you want to delete ${
        task?.title ?? "this task"
      }?\n\nThis task will be removed from the workspace and backend.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    if (!backendConnected || !isBackendTaskId(id)) {
      toast.error("Hapus task hanya tersedia saat backend aktif.");
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync({
        taskId: id,
      });
      toast.success("Task berhasil dihapus.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus task.";
      toast.error(message);
      return;
    }

    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }
  }

  function openExecution(task: Task) {
    const normalizedTask = normalizeTask(task);

    if (isTaskExpiredOverdue(normalizedTask)) {
      toast.error("Task sudah lewat due. Hanya admin yang bisa menjadwalkan ulang.");
      return;
    }

    setSelectedTask(normalizedTask);
    setExecutionForm(normalizedTask.executionDraft ?? emptyTaskExecutionForm);
    setIsExecutionOpen(true);
  }

  function closeExecution() {
    setIsExecutionOpen(false);
    setSelectedTask(null);
    setExecutionForm(emptyTaskExecutionForm);
  }

  async function saveExecutionDraft() {
    if (!selectedTask) return;

    if (isTaskPastDue(selectedTask)) {
      toast.error("Task sudah overdue dan tidak bisa disimpan sebagai draft.");
      return;
    }

    if (!isBackendTaskId(selectedTask.id)) {
      toast.error("Simpan draft hanya tersedia untuk task backend.");
      return;
    }

    const answersJson = buildExecutionAnswers(selectedTask, executionForm);
    const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);

    if (isOnline && backendConnected) {
      const payload = {
        task_id: Number(selectedTask.id),
        form_template_id: getNumericFormTemplateId(selectedTask.formTemplateId),
        source_type: "sop_task",
        status: "draft",
        answers_json: answersJson,
        submitted_by: null,
      };

      try {
        if (existingDraftSession) {
          await updateExecutionSession(existingDraftSession.id, payload);
        } else {
          await createExecutionSession(payload);
        }

        closeExecution();
        toast.success("Draft eksekusi tersimpan.");
        void queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan draft.";
        toast.error(message);
      }

      return;
    }

    try {
      await saveLocalDraft({
        taskId: selectedTask.id,
        form: executionForm,
        answersJson,
        updatedAt: new Date().toISOString(),
      });

      await enqueueMutation({
        id: createLocalId(),
        type: "EXECUTION_DRAFT",
        taskId: selectedTask.id,
        label: selectedTask.title,
        payload: {
          task_id: Number(selectedTask.id),
          form_template_id: getNumericFormTemplateId(selectedTask.formTemplateId),
          answers_json: answersJson,
          existingSessionId: existingDraftSession?.id ?? null,
        },
        createdAt: new Date().toISOString(),
        status: "pending",
      });

      await updateCachedTask(selectedTask.id, (task) => ({
        ...task,
        status: "In Progress",
        executionDraft: executionForm,
      }));

      queryClient.setQueryData<Task[]>(queryKeys.sop.tasks(), (currentTasks) =>
        (currentTasks ?? []).map((task) =>
          task.id === selectedTask.id
            ? normalizeTask({
                ...task,
                status: "In Progress",
                executionDraft: executionForm,
              })
            : task
        )
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] }),
        refreshPendingCount(),
      ]);

      toast.success("Draft disimpan lokal");
      closeExecution();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan draft lokal.";
      toast.error(message);
    }
  }

  function refreshExecutionQueries() {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.sop.tasks(), "corrective-actions"],
      }),
      queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: queryKeys.history.executionSessions() }),
    ]);
  }

  function closeSubmitResult() {
    setSubmitResult(null);
  }

  function markTaskCompletedInCache(taskId: string) {
    queryClient.setQueryData<Task[]>(queryKeys.sop.tasks(), (currentTasks) =>
      (currentTasks ?? []).map((task) =>
        task.id === taskId
          ? normalizeTask({
              ...task,
              status: "Completed",
              executionDraft: undefined,
            })
          : task
      )
    );
  }

  function scoreExecutionPreview(fields: FormField[], form: TaskExecutionForm) {
    return scoreChecklistClientSide({
      fields,
      responses: form.formResponses,
      passThreshold: settings?.pass_threshold,
    });
  }

  async function resolveSubmitLocation(
    knownLocation?: { latitude: number; longitude: number; accuracy_m?: number } | null
  ) {
    if (!settings?.geofence_enabled) return null;

    if (knownLocation) return knownLocation;

    return getCurrentPosition(800, { highAccuracy: false });
  }

  async function submitTaskExecution(
    knownLocation?: { latitude: number; longitude: number; accuracy_m?: number } | null,
    templateFields?: FormField[]
  ) {
    if (!selectedTask) return;

    if (!isBackendTaskId(selectedTask.id)) {
      toast.error("Submit eksekusi hanya tersedia untuk task backend.");
      return;
    }

    if (isTaskPastDue(selectedTask)) {
      toast.error("Task sudah overdue dan tidak bisa dikerjakan.");
      return;
    }

    const validationError = validateExecutionSubmit(executionForm, settings, templateFields);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    let submitLocation: { latitude: number; longitude: number; accuracy_m?: number } | null = null;

    if (settings?.geofence_enabled) {
      submitLocation = await resolveSubmitLocation(knownLocation);

      if (!submitLocation) {
        toast.error("GPS belum tersedia. Izinkan lokasi lalu coba lagi.");
        return;
      }
    }

    if (isOnline && backendConnected) {
      const taskSnapshot = selectedTask;
      const formSnapshot = executionForm;
      const previewChecklist = templateFields?.length
        ? scoreExecutionPreview(templateFields, formSnapshot)
        : null;

      markTaskCompletedInCache(taskSnapshot.id);
      closeExecution();

      if (previewChecklist) {
        setSubmitResult({
          taskTitle: taskSnapshot.title,
          checklist: previewChecklist,
          isSyncing: true,
        });
      }

      void (async () => {
        try {
          const existingDraftSession = latestDraftSessionMap.get(taskSnapshot.id);

          if (existingDraftSession) {
            void deleteExecutionSession(existingDraftSession.id);
          }

          const result = await completeTaskMutation.mutateAsync({
            task: taskSnapshot,
            form: formSnapshot,
            location: submitLocation,
          });

          const checklist = parseSubmitChecklist(result.checklist) ?? previewChecklist;

          if (checklist) {
            setSubmitResult({
              taskTitle: taskSnapshot.title,
              checklist,
              correctiveActionId: result.correctiveTask?.id,
              isSyncing: false,
            });
          } else {
            setSubmitResult(null);
            toast.success("Task selesai.");
          }

          refreshExecutionQueries();
        } catch (error) {
          setSubmitResult(null);
          queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
          const message = error instanceof Error ? error.message : "Gagal menyelesaikan task.";
          toast.error(message);
        }
      })();

      return;
    }

    const answersJson = buildExecutionAnswers(selectedTask, executionForm);
    const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);
    const submittedAt = new Date().toISOString();
    const nextStatus: Task["status"] = approvalRequired ? "In Progress" : "Completed";

    try {
      await deleteLocalDraft(selectedTask.id);

      await enqueueMutation({
        id: createLocalId(),
        type: "EXECUTION_SUBMIT",
        taskId: selectedTask.id,
        label: selectedTask.title,
        payload: {
          task_id: Number(selectedTask.id),
          form_template_id: getNumericFormTemplateId(selectedTask.formTemplateId),
          answers_json: answersJson,
          approvalRequired,
          previousStatus: selectedTask.status,
          existingSessionId: existingDraftSession?.id ?? null,
          latitude: submitLocation?.latitude ?? null,
          longitude: submitLocation?.longitude ?? null,
          accuracy_m: submitLocation?.accuracy_m ?? null,
        },
        createdAt: submittedAt,
        status: "pending",
      });

      await updateCachedTask(selectedTask.id, (task) =>
        normalizeTask({
          ...task,
          status: nextStatus,
          executionDraft: undefined,
          execution: approvalRequired
            ? task.execution
            : {
                operatorName: executionForm.operatorName,
                operatorPosition: executionForm.operatorPosition,
                note: executionForm.note,
                evidence: buildTaskEvidence(executionForm.evidenceText, submittedAt),
                formResponses: executionForm.formResponses,
                completedAt: submittedAt,
              },
        })
      );

      queryClient.setQueryData<Task[]>(queryKeys.sop.tasks(), (currentTasks) =>
        (currentTasks ?? []).map((task) =>
          task.id === selectedTask.id
            ? normalizeTask({
                ...task,
                status: nextStatus,
                executionDraft: undefined,
                execution: approvalRequired
                  ? task.execution
                  : {
                      operatorName: executionForm.operatorName,
                      operatorPosition: executionForm.operatorPosition,
                      note: executionForm.note,
                      evidence: buildTaskEvidence(executionForm.evidenceText, submittedAt),
                      formResponses: executionForm.formResponses,
                      completedAt: submittedAt,
                    },
              })
            : task
        )
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] }),
        refreshPendingCount(),
      ]);

      let offlineChecklist: ChecklistScore | null = null;
      if (selectedTask.formTemplateId) {
        try {
          const template = await formTemplateService.get(selectedTask.formTemplateId);
          offlineChecklist = scoreChecklistClientSide({
            fields: template.fields,
            responses: executionForm.formResponses,
            passThreshold: settings?.pass_threshold,
          });
        } catch {
          offlineChecklist = null;
        }
      }

      if (offlineChecklist) {
        setSubmitResult({
          taskTitle: selectedTask.title,
          checklist: offlineChecklist,
          pendingSync: true,
        });
      } else {
        toast.success(
          approvalRequired
            ? "Evidence disimpan lokal dan akan disinkronkan."
            : "Tersimpan offline — skor akan dihitung saat sync."
        );
      }

      closeExecution();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyelesaikan task secara lokal.";
      toast.error(message);
    }
  }

  return {
    tasks,
    taskSummary,
    selectedTask,
    isFormOpen,
    isEditingTask: Boolean(editingTaskId),
    taskForm,
    setTaskForm,
    openCreateTask,
    openEditTask,
    closeTaskForm,
    submitTaskForm,
    openTaskDetail,
    closeDetail,
    deleteTask,
    executionForm,
    setExecutionForm,
    isExecutionOpen,
    openExecution,
    closeExecution,
    cancelExecutionChanges: closeExecution,
    saveExecutionDraft,
    submitTaskExecution,
    submitResult,
    closeSubmitResult,
    isBackendConnected: backendConnected,
    isOnline,
    pendingLocalSyncCount: pendingSyncCount,
    backendError: backendTasksQuery.error,
  };
}
