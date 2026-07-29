import { AlertCircle, Clock, Lock } from "lucide-react";

import { ProgressChip } from "@/shared/form-progress";

interface FieldTaskCardProps {
  taskId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "completed" | "blocked";
  dueTime: string;
  priority: "low" | "medium" | "high";
  onClick: () => void;
  progress?: number;
  draftProgress?: number;
  isUpcoming?: boolean;
  isOverdue?: boolean;
  isPendingSync?: boolean;
  isFailedSync?: boolean;
  formTemplateName?: string;
  checklistCount?: number;
  checklistPreview?: string[];
  lockedReason?: string;
  isFollowUp?: boolean;
}

const statusColors = {
  open: "border-blue-500 bg-white",
  in_progress: "border-amber-500 bg-white",
  completed: "border-emerald-500 bg-white",
  blocked: "border-red-500 bg-white",
};

export function FieldTaskCard({
  taskId,
  title,
  description,
  status,
  dueTime,
  priority,
  onClick,
  progress,
  draftProgress,
  isUpcoming,
  isOverdue,
  isPendingSync,
  isFailedSync,
  formTemplateName,
  checklistCount,
  checklistPreview,
  lockedReason,
  isFollowUp,
}: FieldTaskCardProps) {
  return (
    <button
      type="button"
      data-task-row-id={taskId}
      onClick={onClick}
      className={`w-full rounded-lg border-l-4 p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${statusColors[status]}`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-bold text-slate-900">{title}</h3>
        {priority === "high" ? (
          <AlertCircle aria-label="High priority" className="h-5 w-5 shrink-0 text-red-500" />
        ) : null}
      </div>

      {description ? <p className="mb-3 line-clamp-2 text-sm text-slate-600">{description}</p> : null}

      {formTemplateName || checklistCount ? (
        <p className="mb-2 text-xs font-medium text-emerald-700">
          {formTemplateName || "Checklist"}
          {checklistCount ? ` • ${checklistCount} items` : ""}
        </p>
      ) : null}

      {checklistPreview && checklistPreview.length > 0 ? (
        <ul className="mb-3 space-y-1">
          {checklistPreview.slice(0, 3).map((label) => (
            <li key={label} className="truncate text-xs text-slate-500">
              • {label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {dueTime}
        </span>
        {isOverdue ? <span className="font-semibold text-red-600">Overdue</span> : null}
        {isUpcoming ? (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Lock className="h-3 w-3" /> Locked
          </span>
        ) : null}
        <span className="font-semibold uppercase tracking-wide text-slate-700">{status}</span>
        {progress !== undefined ? <span className="font-bold">{progress}%</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isPendingSync ? (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Pending sync
          </span>
        ) : null}
        {isFailedSync ? (
          <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
            Sync failed
          </span>
        ) : null}
        {isFollowUp ? (
          <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
            Follow-up
          </span>
        ) : null}
        {draftProgress !== undefined && draftProgress > 0 ? (
          <ProgressChip percentage={draftProgress} />
        ) : null}
      </div>

      {lockedReason ? <p className="mt-2 text-xs text-slate-500">{lockedReason}</p> : null}
    </button>
  );
}
