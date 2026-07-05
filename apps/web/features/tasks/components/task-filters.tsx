import { Search } from "lucide-react";
import { Input } from "@/shared/ui";
import { TaskPriorityFilter, TaskStatusFilter } from "../types";

type TaskFiltersProps = {
  query: string;
  statusFilter: TaskStatusFilter;
  priorityFilter: TaskPriorityFilter;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatusFilter) => void;
  onPriorityFilterChange: (value: TaskPriorityFilter) => void;
};

export function TaskFilters({
  query,
  statusFilter,
  priorityFilter,
  onQueryChange,
  onStatusFilterChange,
  onPriorityFilterChange,
}: TaskFiltersProps) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search tasks, outlets, assignees..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value as TaskStatusFilter)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
      >
        <option>All</option>
        <option>Pending</option>
        <option>In Progress</option>
        <option>Completed</option>
      </select>

      <select
        value={priorityFilter}
        onChange={(event) => onPriorityFilterChange(event.target.value as TaskPriorityFilter)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
      >
        <option>All</option>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
    </div>
  );
}
