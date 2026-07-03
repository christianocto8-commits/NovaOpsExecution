import { X } from "lucide-react";
import { Task } from "../types";

type TaskDetailDrawerProps = {
  task: Task | null;
  onClose: () => void;
};

export function TaskDetailDrawer({ task, onClose }: TaskDetailDrawerProps) {
  if (!task) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {task.id}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {task.title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <div>
          <p className="text-slate-400">Outlet</p>
          <p className="font-semibold text-slate-800">{task.outlet}</p>
        </div>

        <div>
          <p className="text-slate-400">Assignee</p>
          <p className="font-semibold text-slate-800">{task.assignee}</p>
        </div>

        <div>
          <p className="text-slate-400">Description</p>
          <p className="leading-6 text-slate-700">{task.description}</p>
        </div>
      </div>
    </div>
  );
}
