import { Eye, Trash2 } from "lucide-react";
import { EmptyState, Section } from "@/shared/ui";
import {
  Task,
  TaskPriorityFilter,
  TaskStatus,
  TaskStatusFilter,
} from "../types";
import { getPriorityClass, getStatusClass } from "../utils";
import { TaskFilters } from "./task-filters";

type TaskTableProps = {
  tasks: Task[];
  query: string;
  statusFilter: TaskStatusFilter;
  priorityFilter: TaskPriorityFilter;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatusFilter) => void;
  onPriorityFilterChange: (value: TaskPriorityFilter) => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
};

export function TaskTable({
  tasks,
  query,
  statusFilter,
  priorityFilter,
  onQueryChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSelectTask,
  onDeleteTask,
  onStatusChange,
}: TaskTableProps) {
  return (
    <Section
      title="Task Workspace"
      description="Search, filter, update, inspect, and delete operational tasks."
    >
      <TaskFilters
        query={query}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onQueryChange={onQueryChange}
        onStatusFilterChange={onStatusFilterChange}
        onPriorityFilterChange={onPriorityFilterChange}
      />

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Create your first operational task."
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
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.id}</p>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{task.outlet}</td>
                  <td className="px-4 py-4 text-slate-600">{task.assignee}</td>

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
                    <select
                      value={task.status}
                      onChange={(event) =>
                        onStatusChange(task.id, event.target.value as TaskStatus)
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        task.status
                      )}`}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </td>

                  <td className="px-4 py-4 text-slate-600">{task.due}</td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectTask(task)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
