"use client";

import { useMemo, useState } from "react";
import { emptyTaskForm, mockTasks } from "../data/mock-tasks";
import {
  Task,
  TaskFormState,
  TaskPriorityFilter,
  TaskStatus,
  TaskStatusFilter,
} from "../types";

export function useTaskWorkspace() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);

  const filteredTasks = useMemo(() => {
    const value = query.toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        task.title.toLowerCase().includes(value) ||
        task.outlet.toLowerCase().includes(value) ||
        task.assignee.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const metrics = useMemo(() => {
    return {
      total: tasks.length,
      open: tasks.filter((task) => task.status !== "Completed").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
      overdue: tasks.filter(
        (task) => task.due === "Yesterday" && task.status !== "Completed"
      ).length,
    };
  }, [tasks]);

  function openCreateDialog() {
    setEditingTaskId(null);
    setForm(emptyTaskForm);
    setModalOpen(true);
  }

  function openEditDialog(task: Task) {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      outlet: task.outlet,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      due: task.due,
      description: task.description,
    });
    setModalOpen(true);
  }

  function saveTask() {
    if (!form.title.trim()) return;

    if (editingTaskId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                ...form,
              }
            : task
        )
      );
    } else {
      const nextTask: Task = {
        id: `TASK-${String(tasks.length + 1).padStart(3, "0")}`,
        ...form,
      };

      setTasks((current) => [nextTask, ...current]);
    }

    setForm(emptyTaskForm);
    setEditingTaskId(null);
    setModalOpen(false);
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  }

  function updateStatus(id: string, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, status } : task))
    );
  }

  return {
    tasks,
    filteredTasks,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    modalOpen,
    setModalOpen,
    editingTaskId,
    selectedTask,
    setSelectedTask,
    form,
    setForm,
    metrics,
    openCreateDialog,
    openEditDialog,
    saveTask,
    deleteTask,
    updateStatus,
  };
}
