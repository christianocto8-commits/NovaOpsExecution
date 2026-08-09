import { useMemo } from "react";
import { Edit3, Eye, Trash2 } from "lucide-react";

import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { ExportMenu } from "@/shared/export/components";
import { exportToCsv, exportToExcel, exportToPdf } from "@/shared/export/utils";

import { Task, TaskStatus } from "../types";
import { isTaskOverdue } from "../utils/task-inbox";
import { getPriorityClass, getStatusClass } from "../utils";
import { formatTaskSchedule } from "../utils";

type TaskTableProps = {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
};

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "blocked", "cancelled"],
  in_progress: ["blocked", "completed", "cancelled"],
  blocked: ["open", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

function toFrontendStatus(status: string): TaskStatus {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "blocked") return "Blocked";
  if (status === "in_progress") return "In Progress";
  return "Pending";
}

function getNextStatusOptions(task: Task): TaskStatus[] {
  const current = task.backendStatus ?? "open";
  const next = ALLOWED_STATUS_TRANSITIONS[current] ?? [];
  return [...new Set([toFrontendStatus(current), ...next.map(toFrontendStatus)])];
}

function buildTaskFilterDefinitions(tasks: Task[]) {
  const outletNames = [...new Set(tasks.map((task) => task.outlet).filter(Boolean))].sort();

  return [
    {
      key: "outlet",
      label: "Outlet",
      type: "select" as const,
      options: outletNames.map((name) => ({ label: name, value: name })),
    },
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { label: "Pending", value: "Pending" },
        { label: "In Progress", value: "In Progress" },
        { label: "Blocked", value: "Blocked" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select" as const,
      options: [
        { label: "Low", value: "Low" },
        { label: "Medium", value: "Medium" },
        { label: "High", value: "High" },
      ],
    },
    {
      key: "assignee",
      label: "Assignee",
      type: "text" as const,
    },
  ];
}

function getExportRows(tasks: Task[]) {
  return tasks.map((task) => ({
    ID: task.id,
    Task: task.title,
    Outlet: task.outlet,
    Assignee: task.assignee,
    Priority: task.priority,
    Status: task.status,
    Due: task.due,
    Description: task.description,
  }));
}

export function TaskTable({
  tasks,
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskTableProps) {
  const filterDefinitions = useMemo(() => buildTaskFilterDefinitions(tasks), [tasks]);

  const columns: EnterpriseColumn<Task>[] = [
    {
      key: "title",
      header: "Task",
      sortable: true,
      render: (task) => (
        <div>
          <p className="font-semibold text-slate-950">{task.title}</p>
          <p className="text-xs text-slate-500">{task.id}</p>
        </div>
      ),
    },
    {
      key: "outlet",
      header: "Outlet",
      sortable: true,
    },
    {
      key: "assignee",
      header: "Assignee",
      sortable: true,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (task) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (task) => (
        <select
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none ${getStatusClass(
            task.status
          )}`}
        >
          {getNextStatusOptions(task).map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      ),
    },
    {
      key: "due",
      header: "Due",
      sortable: true,
      render: (task) => {
        const isOverdue = Boolean(task.expiredAt) || isTaskOverdue(task);
        return (
          <span
            className={
              isOverdue
                ? "rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700"
                : "text-sm text-slate-700"
            }
            title={task.due}
          >
            {formatTaskSchedule(task)}
          </span>
        );
      },
    },
  ];

  const exportRows = getExportRows(tasks);

  return (
    <EnterpriseDataTable
      title="Task Workspace"
      description="Search, filter, update, inspect, and delete operational tasks."
      columns={columns}
      data={tasks}
      getRowId={(task) => task.id}
      searchPlaceholder="Search tasks, outlets, assignees..."
      emptyTitle="No tasks found"
      emptyDescription="Create your first operational task."
      pageSize={10}
      defaultDensity="comfortable"
      enableFilters
      enableSavedViews
      savedViewScope="tasks-workspace"
      filterDefinitions={filterDefinitions}
      actions={
        <ExportMenu
          onCsvExport={() => exportToCsv(exportRows, "novaops-tasks")}
          onExcelExport={() => exportToExcel(exportRows, "novaops-tasks")}
          onPdfExport={() =>
            exportToPdf({
              title: "NovaOps Tasks",
              fileName: "novaops-tasks",
              rows: exportRows,
              columns: Object.keys(exportRows[0] ?? {}).map((key) => ({
                key: key as keyof (typeof exportRows)[number],
                label: key,
              })),
            })
          }
        />
      }
      rowActions={(task) => (
        <>
          <button
            onClick={() => onSelectTask(task)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onEditTask(task)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDeleteTask(task.id)}
            className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    />
  );
}
