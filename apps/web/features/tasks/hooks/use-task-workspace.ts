"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { emptyTaskExecutionForm, emptyTaskForm, mockTasks } from "@/features/tasks/data/mock-tasks";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useConfirmation } from "@/shared/confirmation";
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

const TASK_STORAGE_KEY = "novaops_tasks_mock";
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

function loadInitialTasks() {
  if (typeof window === "undefined") return mockTasks.map(normalizeTask);

  const raw = window.localStorage.getItem(TASK_STORAGE_KEY);

  if (!raw) return mockTasks.map(normalizeTask);

  try {
    return (JSON.parse(raw) as Task[]).map(normalizeTask);
  } catch {
    return mockTasks.map(normalizeTask);
  }
}

function persistTasks(tasks: Task[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

function upsertTask(tasks: Task[], taskId: string, buildTask: (task: Task) => Task, fallbackTask: Task) {
  let found = false;

  const nextTasks = tasks.map((task) => {
    if (task.id !== taskId) return task;

    found = true;
    return normalizeTask(buildTask(task));
  });

  if (found) return nextTasks;

  return [normalizeTask(buildTask(fallbackTask)), ...nextTasks];
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

function mergeBackendTasksWithLocalState(
  backendTasks: Task[],
  localTasks: Task[],
  executionSessions: ExecutionSessionResponse[]
) {
  const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));
  const latestDraftMap = getLatestDraftSessionsByTask(executionSessions);

  return backendTasks.map((task) => {
    const normalizedTask = normalizeTask(task);
    const localTask = localTaskMap.get(task.id);

    if (normalizedTask.execution?.reviewStatus === "approved" || normalizedTask.status === "Completed") {
      return normalizedTask;
    }

    const draftSession = latestDraftMap.get(task.id);
    const backendDraft = draftSession ? parseExecutionDraft(draftSession) : null;

    if (backendDraft) {
      return normalizeTask({
        ...normalizedTask,
        status: "In Progress",
        executionDraft: backendDraft,
        activity: localTask?.activity ?? normalizedTask.activity,
      });
    }

    if (localTask?.executionDraft) {
      return normalizeTask({
        ...normalizedTask,
        status: "In Progress",
        executionDraft: localTask.executionDraft,
        activity: localTask.activity ?? normalizedTask.activity,
      });
    }

    if (localTask?.execution && !normalizedTask.execution) {
      return normalizeTask({
        ...normalizedTask,
        status: localTask.status,
        execution: localTask.execution,
        activity: localTask.activity ?? normalizedTask.activity,
      });
    }

    return normalizedTask;
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
    mutationFn: taskService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ task, form }: { task: Task; form: TaskExecutionForm }) => {
      if (!isBackendTaskId(task.id)) return;

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

      await taskService.updateStatus(task.id, "completed");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
        queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY }),
      ]);
    },
  });

  const [localTasks, setLocalTasksState] = useState<Task[]>(loadInitialTasks);
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
    if (!backendTasksQuery.data) return localTasks;

    return mergeBackendTasksWithLocalState(backendTasksQuery.data, localTasks, draftSessions);
  }, [backendTasksQuery.data, draftSessions, localTasks]);

  useEffect(() => {
    if (!backendTasksQuery.data) return;
    persistTasks(tasks);
  }, [backendTasksQuery.data, tasks]);

  function setLocalTasks(next: Task[] | ((currentTasks: Task[]) => Task[])) {
    setLocalTasksState((currentTasks) => {
      const resolvedTasks = typeof next === "function" ? next(currentTasks) : next;

      const normalizedTasks = resolvedTasks.map(normalizeTask);
      persistTasks(normalizedTasks);
      return normalizedTasks;
    });
  }

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

  function upsertLocalTaskFromForm() {
    const timestamp = "Just now";
    const taskShifts = taskForm.recurrence === "weekly" ? [] : taskForm.shifts;

    if (editingTaskId) {
      setLocalTasks((currentTasks) =>
        currentTasks.map((task: Task) => {
          if (task.id !== editingTaskId) return task;

          return {
            ...task,
            ...taskForm,
            formTemplateId: taskForm.formTemplateId,
            due: taskForm.recurrence === "once" ? taskForm.due : taskForm.dueTime,
            shifts: taskShifts,
            activity: [
              ...(task.activity ?? []),
              {
                id: `ACT-${Date.now()}-updated`,
                type: "updated",
                title: "Task updated",
                description: "Task information was updated by Owner/Admin.",
                actor: "Owner/Admin",
                timestamp,
              },
            ],
          };
        })
      );

      return;
    }

    const newTask: Task = {
      id: `TASK-${String(localTasks.length + 1).padStart(3, "0")}`,
      title: taskForm.title,
      outlet: taskForm.targetOutlets[0] ?? taskForm.outlet,
      status: taskForm.status,
      priority: taskForm.priority,
      assignee: taskForm.assignee,
      due: taskForm.recurrence === "once" ? taskForm.due : taskForm.dueTime,
      dueTime: taskForm.dueTime,
      weeklyPublishDay: taskForm.weeklyPublishDay,
      description: taskForm.description,
      formTemplateId: taskForm.formTemplateId,
      recurrence: taskForm.recurrence,
      shifts: taskShifts,
      targetOutlets: taskForm.targetOutlets,
      autoPublish: taskForm.autoPublish,
      activity: [
        {
          id: `ACT-${Date.now()}-created`,
          type: "created",
          title: "Task created",
          description: `Task created for ${taskForm.outlet}.`,
          actor: "Owner/Admin",
          timestamp,
        },
      ],
    };

    setLocalTasks((currentTasks) => [newTask, ...currentTasks]);
  }

  async function submitTaskForm() {
    if (backendConnected) {
      try {
        if (editingTaskId && isBackendTaskId(editingTaskId)) {
          await updateTaskMutation.mutateAsync({ taskId: editingTaskId, form: taskForm });
        } else {
          await createTaskMutation.mutateAsync(taskForm);
        }

        closeTaskForm();
        return;
      } catch {
        // Keep the workspace usable when the backend session expires or outlet context is missing.
      }
    }

    upsertLocalTaskFromForm();
    closeTaskForm();
  }

  function openTaskDetail(task: Task) {
    setSelectedTask(task);
  }

  function closeDetail() {
    setSelectedTask(null);
  }

  function reviewTaskExecution(taskId: string, review: TaskReviewStatus, note: string) {
    const timestamp = "Just now";
    const approved = review === "approved";

    setLocalTasks((currentTasks) =>
      currentTasks.map((task: Task) => {
        if (task.id !== taskId || !task.execution) return task;

        return {
          ...task,
          status: approved ? "Completed" : "In Progress",
          executionDraft: approved
            ? undefined
            : {
                operatorName: task.execution.operatorName,
                operatorPosition: task.execution.operatorPosition,
                note: task.execution.note,
                evidenceText: "",
                formResponses: task.execution.formResponses,
              },
          execution: {
            ...task.execution,
            reviewStatus: review,
            reviewedBy: "Owner/Admin",
            reviewedAt: timestamp,
            reviewNote: note,
          },
          activity: [
            ...(task.activity ?? []),
            {
              id: `ACT-${Date.now()}-${approved ? "approved" : "rejected"}`,
              type: approved ? "review_approved" : "review_rejected",
              title: approved ? "Evidence approved" : "Evidence rejected",
              description:
                note ||
                (approved
                  ? "Owner approved submitted evidence."
                  : "Owner requested corrective follow-up."),
              actor: "Owner/Admin",
              timestamp,
            },
          ],
        };
      })
    );

    setSelectedTask((currentTask) => {
      if (!currentTask || currentTask.id !== taskId || !currentTask.execution) return currentTask;

      const approvedCurrent = review === "approved";

      return {
        ...currentTask,
        status: approvedCurrent ? "Completed" : "In Progress",
        executionDraft: approvedCurrent
          ? undefined
          : {
              operatorName: currentTask.execution.operatorName,
              operatorPosition: currentTask.execution.operatorPosition,
              note: currentTask.execution.note,
              evidenceText: "",
              formResponses: currentTask.execution.formResponses,
            },
        execution: {
          ...currentTask.execution,
          reviewStatus: review,
          reviewedBy: "Owner/Admin",
          reviewedAt: timestamp,
          reviewNote: note,
        },
        activity: [
          ...(currentTask.activity ?? []),
          {
            id: `ACT-${Date.now()}-${approvedCurrent ? "approved" : "rejected"}`,
            type: approvedCurrent ? "review_approved" : "review_rejected",
            title: approvedCurrent ? "Evidence approved" : "Evidence rejected",
            description:
              note ||
              (approvedCurrent
                ? "Owner approved submitted evidence."
                : "Owner requested corrective follow-up."),
            actor: "Owner/Admin",
            timestamp,
          },
        ],
      };
    });
  }

  async function deleteTask(id: string) {
    const task = tasks.find((item: Task) => item.id === id);

    const confirmed = await confirm({
      title: "Delete Task",
      description: `Are you sure you want to delete ${
        task?.title ?? "this task"
      }?\n\nThis task will be removed from the workspace${backendConnected ? " and backend" : " and local task store"}.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    if (backendConnected && isBackendTaskId(id)) {
      try {
        await deleteTaskMutation.mutateAsync(id);
      } catch {
        return;
      }
    } else {
      setLocalTasks((currentTasks) => currentTasks.filter((task: Task) => task.id !== id));
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

    const timestamp = "Just now";

    setLocalTasks((currentTasks) =>
      upsertTask(
        currentTasks,
        selectedTask.id,
        (task) => ({
          ...task,
          status: "In Progress",
          executionDraft: executionForm,
          activity: [
            ...(task.activity ?? []),
            {
              id: `ACT-${Date.now()}-draft`,
              type: "draft_saved",
              title: "Execution draft saved",
              description: `${
                executionForm.operatorName || "Outlet operator"
              } saved form progress.`,
              actor: executionForm.operatorName || "Outlet Operator",
              timestamp,
            },
          ],
        }),
        selectedTask
      )
    );

    if (backendConnected && isBackendTaskId(selectedTask.id)) {
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
      } catch {
        // Keep local draft intact when backend draft sync fails.
      }
    }

    closeExecution();
  }

  async function submitTaskExecution() {
    if (!selectedTask) return;

    if (backendConnected && isBackendTaskId(selectedTask.id)) {
      try {
        const existingDraftSession = latestDraftSessionMap.get(selectedTask.id);

        if (existingDraftSession) {
          await deleteExecutionSession(existingDraftSession.id);
        }

        await completeTaskMutation.mutateAsync({ task: selectedTask, form: executionForm });
        closeExecution();
        return;
      } catch {
        // Fall through to local completion if API status transition fails.
      }
    }

    const completedAt = "Just now";
    const evidenceValue = executionForm.evidenceText.trim();

    const evidence = buildTaskEvidence(evidenceValue, completedAt);

    setLocalTasks((currentTasks) =>
      upsertTask(
        currentTasks,
        selectedTask.id,
        (task) => ({
          ...task,
          status: approvalRequired ? "In Progress" : "Completed",
          executionDraft: undefined,
          execution: {
            operatorName: executionForm.operatorName,
            operatorPosition: executionForm.operatorPosition,
            note: executionForm.note,
            evidence,
            formResponses: executionForm.formResponses,
            completedAt,
            reviewStatus: approvalRequired ? "pending_review" : "approved",
          },
          activity: [
            ...(task.activity ?? []),
            {
              id: `ACT-${Date.now()}-completed`,
              type: "completed",
              title: "Evidence submitted",
              description: approvalRequired
                ? "Outlet submitted task evidence for owner review."
                : "Outlet submitted task evidence and it was auto-approved by workspace settings.",
              actor: executionForm.operatorName,
              timestamp: completedAt,
            },
          ],
        }),
        selectedTask
      )
    );

    closeExecution();
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
