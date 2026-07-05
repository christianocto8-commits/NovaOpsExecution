import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Image,
  Link2,
  StickyNote,
  UserCheck,
  X,
} from "lucide-react";

import { Task, TaskActivityType, TaskEvidenceType } from "../types";
import { formatTaskDue } from "../utils";

type TaskDetailDrawerProps = {
  task: Task | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
};

function getStatusClass(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "In Progress") return "bg-blue-50 text-blue-700 border-blue-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function getPriorityClass(priority: string) {
  if (priority === "High") return "bg-rose-50 text-rose-700 border-rose-100";
  if (priority === "Medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-50 text-slate-700 border-slate-100";
}

function getEvidenceStyle(type: TaskEvidenceType) {
  if (type === "photo")
    return { icon: Image, label: "PHOTO", className: "border-blue-100 bg-blue-50 text-blue-700" };
  if (type === "url")
    return {
      icon: Link2,
      label: "URL",
      className: "border-violet-100 bg-violet-50 text-violet-700",
    };
  if (type === "document")
    return {
      icon: FileText,
      label: "DOCUMENT",
      className: "border-amber-100 bg-amber-50 text-amber-700",
    };
  return {
    icon: StickyNote,
    label: "NOTE",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };
}

function getActivityStyle(type: TaskActivityType) {
  if (type === "completed")
    return { icon: CheckCircle2, className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  if (type === "assigned")
    return { icon: UserCheck, className: "border-blue-100 bg-blue-50 text-blue-700" };
  if (type === "evidence_submitted" || type === "draft_saved")
    return { icon: FileText, className: "border-violet-100 bg-violet-50 text-violet-700" };
  return { icon: ClipboardList, className: "border-slate-200 bg-white text-slate-600" };
}

export function TaskDetailDrawer({ task, onClose, onEdit }: TaskDetailDrawerProps) {
  if (!task) return null;

  const hasExecution = Boolean(task.execution);
  const hasDraft = Boolean(task.executionDraft);
  const activities = task.activity ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                {task.id}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{task.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(task.status)}`}
                >
                  {task.status}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(task.priority)}`}
                >
                  {task.priority}
                </span>
                {hasDraft ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Draft Saved
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-950">Task Information</h3>

            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-400">Outlet</p>
                <p className="font-semibold text-slate-800">{task.outlet}</p>
              </div>
              <div>
                <p className="text-slate-400">Assignee</p>
                <p className="font-semibold text-slate-800">{task.assignee}</p>
              </div>
              <div>
                <p className="text-slate-400">Due Date & Time</p>
                <p className="font-semibold text-slate-800">{formatTaskDue(task.due)}</p>
              </div>
              <div>
                <p className="text-slate-400">Execution Status</p>
                <p className="font-semibold text-slate-800">
                  {hasExecution ? "Submitted" : hasDraft ? "Draft saved" : "Not submitted"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{task.description}</p>
            </div>
          </section>

          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
            >
              Edit Task
            </button>
          ) : null}

          {task.executionDraft && !task.execution ? (
            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="text-sm font-bold text-blue-950">Saved Execution Draft</h3>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-blue-500">Operator</p>
                  <p className="font-semibold text-blue-950">
                    {task.executionDraft.operatorName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-blue-500">Position</p>
                  <p className="font-semibold text-blue-950">
                    {task.executionDraft.operatorPosition}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-blue-500">Draft Note</p>
                <p className="mt-1 text-sm leading-6 text-blue-900">
                  {task.executionDraft.note || "No note yet."}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-blue-500">Draft Evidence</p>
                <p className="mt-1 break-words text-sm leading-6 text-blue-900">
                  {task.executionDraft.evidenceText || "No evidence yet."}
                </p>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">Outlet Execution Audit</h3>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  hasExecution
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : hasDraft
                      ? "border-blue-100 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {hasExecution
                  ? "Evidence submitted"
                  : hasDraft
                    ? "Draft saved"
                    : "Waiting evidence"}
              </span>
            </div>

            {task.execution ? (
              <div className="mt-4 space-y-5 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-400">Operator</p>
                    <p className="font-semibold text-slate-800">{task.execution.operatorName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Position</p>
                    <p className="font-semibold text-slate-800">
                      {task.execution.operatorPosition}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Completed At</p>
                    <p className="font-semibold text-slate-800">{task.execution.completedAt}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Evidence Count</p>
                    <p className="font-semibold text-slate-800">{task.execution.evidence.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Execution Note
                  </p>
                  <p className="mt-2 leading-6 text-slate-700">{task.execution.note}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Evidence Attachments
                  </p>

                  {task.execution.evidence.map((evidence) => {
                    const evidenceStyle = getEvidenceStyle(evidence.type);
                    const EvidenceIcon = evidenceStyle.icon;
                    const isUrl = evidence.type === "url";

                    return (
                      <div
                        key={evidence.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${evidenceStyle.className}`}
                          >
                            <EvidenceIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${evidenceStyle.className}`}
                              >
                                {evidenceStyle.label}
                              </span>
                              <p className="text-xs text-slate-400">{evidence.submittedAt}</p>
                            </div>
                            <p className="mt-2 font-semibold text-slate-900">
                              {evidence.label ?? evidenceStyle.label}
                            </p>
                            {isUrl ? (
                              <a
                                href={evidence.value}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block break-all text-sm font-medium text-emerald-700 hover:text-emerald-800"
                              >
                                {evidence.value}
                              </a>
                            ) : (
                              <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                                {evidence.value}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                {hasDraft
                  ? "Outlet sudah menyimpan draft execution, tetapi belum submit final."
                  : "Belum ada execution evidence dari outlet. Task masih menunggu submit operator."}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-950">Activity Timeline</h3>

            {activities.length > 0 ? (
              <div className="mt-5 space-y-4">
                {activities.map((activity, index) => {
                  const activityStyle = getActivityStyle(activity.type);
                  const ActivityIcon = activityStyle.icon;
                  const isLast = index === activities.length - 1;

                  return (
                    <div key={activity.id} className="relative flex gap-3">
                      {!isLast ? (
                        <div className="absolute left-5 top-11 h-full w-px bg-slate-200" />
                      ) : null}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${activityStyle.className}`}
                      >
                        <ActivityIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{activity.title}</p>
                          <p className="text-xs text-slate-400">{activity.timestamp}</p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {activity.description}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          Actor: {activity.actor}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Belum ada activity log untuk task ini.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
