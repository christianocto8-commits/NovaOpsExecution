"use client";

import { CheckCircle2, Clock, Plus, Search, AlertTriangle } from "lucide-react";
import { Button, EmptyState, Input, PageHeader, Section } from "@/shared/ui";

const tasks = [
  {
    id: "TASK-001",
    title: "Daily opening checklist",
    outlet: "KOV Montre",
    status: "In Progress",
    priority: "High",
    assignee: "Lead Barista",
    due: "Today",
  },
  {
    id: "TASK-002",
    title: "Espresso machine cleaning audit",
    outlet: "KOV Heritage",
    status: "Pending",
    priority: "Medium",
    assignee: "Senior Barista",
    due: "Tomorrow",
  },
  {
    id: "TASK-003",
    title: "Inventory variance review",
    outlet: "KOV Sultan Agung",
    status: "Completed",
    priority: "Low",
    assignee: "Head Barista",
    due: "Yesterday",
  },
];

function getStatusClass(status: string) {
  if (status === "Completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "In Progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getPriorityClass(priority: string) {
  if (priority === "High") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function TasksWorkspace() {
  return (
    <main className="space-y-6 p-6">
      <PageHeader
        eyebrow="Task Management"
        title="Enterprise Tasks"
        description="Manage operational assignments, outlet follow-ups, checklist actions, and accountability tracking."
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            New Task
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Open Tasks</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">18</p>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </Section>

        <Section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed Today</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">42</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </Section>

        <Section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">3</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        </Section>
      </div>

      <Section
        title="Task Workspace"
        description="Search and monitor task execution across outlets."
        actions={
          <div className="w-80">
            <Input placeholder="Search tasks..." />
          </div>
        }
      >
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            description="Create your first operational task to start tracking outlet execution."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Outlet</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500">{task.id}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{task.outlet}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {task.assignee}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{task.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}