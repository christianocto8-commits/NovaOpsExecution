"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { emptyTaskExecutionForm, emptyTaskForm } from "@/features/tasks/data/mock-tasks";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useConfirmation } from "@/shared/confirmation";
import { useToast } from "@/shared/toast";
import { Task, TaskExecutionForm, TaskFormState, TaskReviewStatus } from "@/features/tasks/types";
import { createMockEvidence, detectEvidenceType } from "@/shared/files";
import { EvidenceItem } from "@/shared/evidence";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import {
  createExecutionSession,
  deleteExecutionSession,
  getExecutionSessions,
  updateExecutionSession,
  type ExecutionSessionResponse,
} from "@/services/execution-session.service";

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
    formTemplateId: task.formTemplateId ?? "FORM-OPENING",
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

function mergeBackendTasksWithDrafts(
  backendTasks: Task[],
  executionSessions: ExecutionSessionResponse[]
) {
  const latestDraftMap = getLatestDraftSessionsByTask(executionSessions);

  return backendTasks.map((task) => {
    const normalizedTask = normalizeTask(task);

    if (normalizedTask.execution?.reviewStatus === "approved" || normalizedTask.status === "Completed") {
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

function buildTaskEvidence(value: string, submittedAt: string) {
  const galleryItems = parseEvidenceGallery(value);

  if (galleryItems.length > 0) {
    return galleryItems.map((item) =>
      createMockEvidence({
        type: detectEvidenceType(item.url),
        label: item.caption || "Outlet Evidence",
        value: item.url,
        submittedAt: item.uploadedAt ?? submittedAt,
      })
    );
  }

  return [
    createMockEvidence({
      type: value ? detectEvidenceType(value) : "note",
      label: value ? "Outlet Evidence" : "Execution Confirmation",
      value: value || "Execution completed without additional evidence attachment.",
      submittedAt,
    }),
  ];
}

export function useTaskWorkspace() {
  const { settings } = useSettings();
  const defaultTaskDueTime = settings?.default_task_due_time ?? "09:00";
  const approvalRequired = settings?.approval_required ?? true;
  const confirm = useConfirmation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const backendTasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
    retry: false,
  });

  const executionSessionsQuery = useQuery({
    queryKey: EXECUTION_DRAFT_QUERY_KEY,
    queryFn: () => getExecutionSessions({ sourceType: "sop_task" }),
    retry: false,
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

  const reviewTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      review,
      note,
    }: {
      taskId: string;
      review: "approved" | "rejected";
      note: string;
    }) => taskService.review(taskId, review, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ task, form }: { task: Task; form: TaskExecutionForm }) => {
      await createExecutionSession({
        task_id: Number(task.id),
        form_template_id: getNumericFormTemplateId(task.formTemplateId),
        source_type: "sop_task",
        status: "completed",
        answers_json: buildExecutionAnswers(task, form),
        submitted_by: null,
      });

      if (task.status === "Pending") {
        await taskService.updateStatus(task.id, "in_progress");
      }

      if (approvalRequired) {
        return;
      }

      await taskService.updateStatus(task.id, "completed");
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
  const latestDraftSessionMap = useMemo(
    () => getLatestDraftSessionsByTask(draftSessions),
    [draftSessions]
  );

  const tasks = useMemo(() => {
    if (!backendTasksQuery.data) return [];

    return mergeBackendTasksWithDrafts(backendTasksQuery.data, draftSessions);
  }, [backendTasksQuery.data, draftSessions]);

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
      formTemplateId: task.formTemplateId ?? "FORM-OPENING",
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
    if (!backendConnected) {
      toast.error("Backend belum tersedia. Jalankan NovaOps API terlebih dahulu.");
      return;
    }

    try {
      if (editingTaskId && isBackendTaskId(editingTaskId)) {
        await updateTaskMutation.mutateAsync({ taskId: editingTaskId, form: taskForm });
        toast.success("Task berhasil diperbarui.");
      } else {
        await createTaskMutation.mutateAsync(taskForm);
        toast.success(
          taskForm.recurrence !== "once"
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

  async function reviewTaskExecution(taskId: string, review: TaskReviewStatus, note: string) {
    if (review !== "approved" && review !== "rejected") {
      return;
    }

    if (!backendConnected || !isBackendTaskId(taskId)) {
      toast.error("Review hanya tersedia saat backend aktif.");
      return;
    }

    try {
      await reviewTaskMutation.mutateAsync({ taskId, review, note });
      toast.success(review === "approved" ? "Evidence disetujui." : "Evidence ditolak.");
      closeDetail();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memproses review.";
      toast.error(message);
    }
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

    if (!backendConnected || !isBackendTaskId(selectedTask.id)) {
      toast.error("Simpan draft hanya tersedia saat backend aktif.");
      return;
    }

    const payload = {
      task_id: Number(selectedTask.id),
      form_template_id: getNumericFormTemplateId(selectedTask.formTemplateId),
      source_type: "sop_task",
      status: "draft",
      answers_json: buildExecutionAnswers(selectedTask, executionForm),
      submitted_by: null,
    };

    const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);

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
  }

  async function submitTaskExecution() {
    if (!selectedTask) return;

    if (!backendConnected || !isBackendTaskId(selectedTask.id)) {
      toast.error("Submit eksekusi hanya tersedia saat backend aktif.");
      return;
    }

    try {
      const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);

      if (existingDraftSession) {
        await deleteExecutionSession(existingDraftSession.id);
      }

      await completeTaskMutation.mutateAsync({ task: selectedTask, form: executionForm });
      toast.success(
        approvalRequired
          ? "Evidence dikirim dan menunggu review."
          : "Task selesai dan evidence tersimpan."
      );
      closeExecution();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyelesaikan task.";
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
    reviewTaskExecution,
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
    backendError: backendTasksQuery.error,
  };
}
