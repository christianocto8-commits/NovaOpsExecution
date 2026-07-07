"use client";

import { useMemo, useState } from "react";

import { emptyTaskExecutionForm, emptyTaskForm, mockTasks } from "@/features/tasks/data/mock-tasks";
import { useConfirmation } from "@/shared/confirmation";
import { Task, TaskExecutionForm, TaskFormState } from "@/features/tasks/types";
import { createMockEvidence, detectEvidenceType } from "@/shared/files";

type WorkspaceRole = "owner" | "outlet";

const TASK_STORAGE_KEY = "novaops_tasks_mock";

function normalizeTask(task: Task): Task {
  return {
    ...task,
    formTemplateId: task.formTemplateId ?? "FORM-OPENING",
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

export function useTaskWorkspace() {
  const confirm = useConfirmation();

  const [tasks, setTasksState] = useState<Task[]>(loadInitialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentRole, setCurrentRole] = useState<WorkspaceRole>("owner");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [executionForm, setExecutionForm] = useState<TaskExecutionForm>(emptyTaskExecutionForm);

  function setTasks(next: Task[] | ((currentTasks: Task[]) => Task[])) {
    setTasksState((currentTasks) => {
      const resolvedTasks = typeof next === "function" ? next(currentTasks) : next;

      const normalizedTasks = resolvedTasks.map(normalizeTask);
      persistTasks(normalizedTasks);
      return normalizedTasks;
    });
  }

  const taskSummary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "Pending").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
    };
  }, [tasks]);

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm({
      ...emptyTaskForm,
      assignee: "Outlet Team",
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
    });
    setIsFormOpen(true);
  }

  function closeTaskForm() {
    setIsFormOpen(false);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
  }

  function submitTaskForm() {
    const timestamp = "Just now";

    if (editingTaskId) {
      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          if (task.id !== editingTaskId) return task;

          return {
            ...task,
            ...taskForm,
            formTemplateId: taskForm.formTemplateId,
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

      closeTaskForm();
      return;
    }

    const newTask: Task = {
      id: `TASK-${String(tasks.length + 1).padStart(3, "0")}`,
      title: taskForm.title,
      outlet: taskForm.outlet,
      status: taskForm.status,
      priority: taskForm.priority,
      assignee: taskForm.assignee,
      due: taskForm.due,
      description: taskForm.description,
      formTemplateId: taskForm.formTemplateId,
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

    setTasks((currentTasks) => [newTask, ...currentTasks]);
    closeTaskForm();
  }

  function openTaskDetail(task: Task) {
    setSelectedTask(task);
  }

  function closeDetail() {
    setSelectedTask(null);
  }

  async function deleteTask(id: string) {
    const task = tasks.find((item) => item.id === id);

    const confirmed = await confirm({
      title: "Delete Task",
      description: `Are you sure you want to delete ${
        task?.title ?? "this task"
      }?\n\nThis task will be removed from the workspace and local task store.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));

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

  function saveExecutionDraft() {
    if (!selectedTask) return;

    const timestamp = "Just now";

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== selectedTask.id) return task;

        return {
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
        };
      })
    );

    closeExecution();
  }

  function submitTaskExecution() {
    if (!selectedTask) return;

    const completedAt = "Just now";
    const evidenceValue = executionForm.evidenceText.trim();

    const evidence = [
      createMockEvidence({
        type: evidenceValue ? detectEvidenceType(evidenceValue) : "note",
        label: evidenceValue ? "Outlet Evidence" : "Execution Confirmation",
        value: evidenceValue || "Execution completed without additional evidence attachment.",
        submittedAt: completedAt,
      }),
    ];

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== selectedTask.id) return task;

        return {
          ...task,
          status: "Completed",
          executionDraft: undefined,
          execution: {
            operatorName: executionForm.operatorName,
            operatorPosition: executionForm.operatorPosition,
            note: executionForm.note,
            evidence,
            formResponses: executionForm.formResponses,
            completedAt,
          },
          activity: [
            ...(task.activity ?? []),
            {
              id: `ACT-${Date.now()}-completed`,
              type: "completed",
              title: "Task completed",
              description: "Outlet task execution completed.",
              actor: executionForm.operatorName,
              timestamp: completedAt,
            },
          ],
        };
      })
    );

    closeExecution();
  }

  return {
    currentRole,
    setCurrentRole,
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
  };
}

