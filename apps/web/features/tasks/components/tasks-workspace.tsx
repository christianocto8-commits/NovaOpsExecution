"use client";

import { Plus } from "lucide-react";
import { Button, PageHeader } from "@/shared/ui";
import { useTaskWorkspace } from "../hooks";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskMetrics } from "./task-metrics";
import { TaskTable } from "./task-table";

export function TasksWorkspace() {
  const taskWorkspace = useTaskWorkspace();

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Task Management"
        title="Enterprise Tasks"
        description="Manage operational assignments, outlet follow-ups, checklist actions, and accountability tracking."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => taskWorkspace.setModalOpen(true)}
          >
            New Task
          </Button>
        }
      />

      <TaskMetrics
        open={taskWorkspace.metrics.open}
        completed={taskWorkspace.metrics.completed}
        overdue={taskWorkspace.metrics.overdue}
      />

      <TaskTable
        tasks={taskWorkspace.filteredTasks}
        query={taskWorkspace.query}
        statusFilter={taskWorkspace.statusFilter}
        priorityFilter={taskWorkspace.priorityFilter}
        onQueryChange={taskWorkspace.setQuery}
        onStatusFilterChange={taskWorkspace.setStatusFilter}
        onPriorityFilterChange={taskWorkspace.setPriorityFilter}
        onSelectTask={taskWorkspace.setSelectedTask}
        onDeleteTask={taskWorkspace.deleteTask}
        onStatusChange={taskWorkspace.updateStatus}
      />

      <TaskFormDialog
        open={taskWorkspace.modalOpen}
        form={taskWorkspace.form}
        onClose={() => taskWorkspace.setModalOpen(false)}
        onFormChange={taskWorkspace.setForm}
        onCreate={taskWorkspace.createTask}
      />

      <TaskDetailDrawer
        task={taskWorkspace.selectedTask}
        onClose={() => taskWorkspace.setSelectedTask(null)}
      />
    </main>
  );
}
