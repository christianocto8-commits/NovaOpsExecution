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
} from "@/features/tasks/types";
import { createTaskEvidence, detectEvidenceType } from "@/shared/files";
import { EvidenceItem } from "@/shared/evidence";
import { queryKeys } from "@/lib/query/keys";
import { createLocalId } from "@/lib/local-id";
import { enrichTaskFormOutlets } from "@/features/tasks/utils/enrich-task-form-outlets";
import { taskService } from "@/services/task.service";
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

function normalizeTask(task: Task): Task {
  const recurrence = task.recurrence ?? "once";

  return {
    ...task,
    formTemplateId: task.formTemplateId ?? "",
    recurrence,
    shifts: recurrence === "weekly" ? [] : (task.shifts ?? ["morning"]),
    targetOutlets: task.targetOutlets ?? [task.outlet],
    autoPublish: task.autoPublish ?? false,
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
      Object.entries(responses ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : ""])
    ),
  };
}

function getLatestDraftSessionsByTask(executionSessions: ExecutionSessionResponse[]) {
  const latestDraftMap = new Map<string, ExecutionSessionResponse>();

  executionSessions.forEach((session) => {
    if (session.status !== "draft" || session.source_type !== "sop_task" || session.task_id == null) {
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
    if (session.status !== "completed" || session.source_type !== "sop_task" || session.task_id == null) {
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

function hasPhotoEvidence(evidenceText: string) {
  const galleryItems = parseEvidenceGallery(evidenceText);
  return galleryItems.some((item) => /uploads\/evidence|\.(jpg|jpeg|png|webp|heic)/i.test(item.url));
}

function validateExecutionSubmit(
  form: TaskExecutionForm,
  settings?: {
    photo_required_by_default?: boolean;
    evidence_required?: boolean;
  } | null
) {
  if (settings?.photo_required_by_default && !hasPhotoEvidence(form.evidenceText)) {
    return "Bukti foto wajib diunggah.";
  }

  if (settings?.evidence_required) {
    const hasEvidence = Boolean(form.evidenceText.trim()) || Boolean(form.note.trim());
    if (!hasEvidence) {
      return "Evidence atau catatan wajib diisi.";
    }
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

function parseExecutionSession(session: ExecutionSessionResponse): TaskExecution | null {
  const payload = session.answers_json;

  if (!payload || typeof payload !== "object") return null;

  const operator = payload.operator as Record<string, unknown> | undefined;
  const responses = payload.responses as Record<string, unknown> | undefined;
  const submittedAt =
    typeof payload.submittedAt === "string"
      ? payload.submittedAt
      : session.submitted_at ?? new Date().toISOString();
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
      Object.entries(responses ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : ""])
    ),
    completedAt: submittedAt,
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
      return normalizeTask({
        ...normalizedTask,
        execution: normalizedTask.execution ?? parsedExecution,
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
  const approvalRequired = isOutletWorkspace
    ? false
    : (settings?.approval_required ?? false);
  const confirm = useConfirmation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const { refreshPendingCount, pendingSyncCount } = useOfflineSync();

  const backendTasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
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

  async function deleteTask(id: string) {
    mutationFn: async ({ task, form }: { task: Task; form: TaskExecutionForm }) => {
      await taskService.submitExecution(task.id, {
        form_template_id: getNumericFormTemplateId(task.formTemplateId),
        answers_json: buildExecutionAnswers(task, form),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
        queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY }),
      ]);
    },
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
      completed: tasks.filter((task: Task) => task.status === "Completed").length,
    };
  }, [tasks]);

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm({
      ...emptyTaskForm,
      assignee: "Outlet Team",
      dueTime: defaultTaskDueTime,
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
      due: task.due,
      description: task.description,
      formTemplateId: task.formTemplateId ?? "",
      recurrence: task.recurrence ?? "once",
      shifts: task.shifts ?? ["morning"],
      targetOutlets: task.targetOutlets ?? [task.outlet],
      autoPublish: task.autoPublish ?? false,
      dueTime: task.dueTime ?? getTimeFromDue(task.due, defaultTaskDueTime),
      weeklyPublishDay: task.weeklyPublishDay ?? "sunday",
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

    if (readyForm.recurrence === "once" && !readyForm.outletId) {
      toast.error(
        "Outlet belum dipilih. Buat outlet di menu Outlets terlebih dahulu, lalu coba lagi."
      );
      return;
    }

    if (
      readyForm.recurrence !== "once" &&
      (!readyForm.targetOutletIds || readyForm.targetOutletIds.length === 0)
    ) {
      toast.error("Pilih minimal satu outlet untuk task recurring.");
      return;
    }

    try {
      if (!backendConnected) {
        toast.info("Menyambungkan ke backend, tunggu sebentar...");
        await queryClient.fetchQuery({
          queryKey: queryKeys.sop.tasks(),
          queryFn: taskService.list,
        });
      }

      if (editingTaskId && isBackendTaskId(editingTaskId)) {
        await updateTaskMutation.mutateAsync({ taskId: editingTaskId, form: readyForm });
        toast.success("Task berhasil diperbarui.");
      } else {
        await createTaskMutation.mutateAsync(readyForm);
        toast.success(
          readyForm.recurrence !== "once"
            ? "Schedule recurring berhasil dibuat."
            : "Task berhasil dibuat."
        );
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

        await queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY });
        toast.success("Draft eksekusi tersimpan.");
        closeExecution();
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

  async function submitTaskExecution() {
    if (!selectedTask) return;

    if (!isBackendTaskId(selectedTask.id)) {
      toast.error("Submit eksekusi hanya tersedia untuk task backend.");
      return;
    }

    const validationError = validateExecutionSubmit(executionForm, settings);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (isOnline && backendConnected) {
      try {
        const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);

        if (existingDraftSession) {
          await deleteExecutionSession(existingDraftSession.id);
        }

        await completeTaskMutation.mutateAsync({ task: selectedTask, form: executionForm });
        toast.success("Task selesai dan evidence tersimpan.");
        closeExecution();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyelesaikan task.";
        toast.error(message);
      }

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
        payload: {
          task_id: Number(selectedTask.id),
          form_template_id: getNumericFormTemplateId(selectedTask.formTemplateId),
          answers_json: answersJson,
          approvalRequired,
          previousStatus: selectedTask.status,
          existingSessionId: existingDraftSession?.id ?? null,
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

      toast.success(
        approvalRequired
          ? "Evidence disimpan lokal dan akan disinkronkan."
          : "Task selesai secara lokal dan akan disinkronkan."
      );
      closeExecution();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyelesaikan task secara lokal.";
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
    isBackendConnected: backendConnected,
    isOnline,
    pendingLocalSyncCount: pendingSyncCount,
    backendError: backendTasksQuery.error,
  };
}
