"use client";

import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Image,
  Link2,
  MapPin,
  StickyNote,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Task, TaskActivityType, TaskEvidenceType } from "../types";
import { formatTaskSchedule } from "../utils";
import { PhotoLightbox } from "@/shared/evidence/components/photo-lightbox";
import { useEvidenceDisplayUrl } from "@/shared/evidence/hooks/use-evidence-display-url";
import { taskService, type OutletMember } from "@/services/task.service";
import { mapBackendTask } from "@/services/task.service";
import { queryKeys } from "@/lib/query/keys";
import { useToast } from "@/shared/toast";

type TaskDetailDrawerProps = {
  task: Task | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
};

function getChecklistStatusClass(status: string) {
  if (status === "pass") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "attention") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

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
  if (type === "review_approved")
    return { icon: CheckCircle2, className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  if (type === "review_rejected")
    return { icon: X, className: "border-red-100 bg-red-50 text-red-700" };
  return { icon: ClipboardList, className: "border-slate-200 bg-white text-slate-600" };
}

function EvidencePhotoPreview({ src, alt }: { src: string; alt: string }) {
  const displayUrl = useEvidenceDisplayUrl(src);

  if (!displayUrl) {
    return (
      <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
        Loading evidence...
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displayUrl} alt={alt} className="max-h-48 w-full object-cover" />
  );
}

export function TaskDetailDrawer({ task, onClose, onEdit, onDelete }: TaskDetailDrawerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const queryClient = useQueryClient();
  const toast = useToast();

  const outletMembersQuery = useQuery({
    queryKey: ["task-outlet-members", task?.outletId ?? "none"],
    queryFn: () => taskService.listOutletMembers(task!.outletId!),
    enabled: Boolean(task?.outletId),
    retry: false,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["task-assignments", task?.id ?? "none"],
    queryFn: () => taskService.listAssignments(task!.id),
    enabled: Boolean(task),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ["task-detail", task?.id ?? "none"],
    queryFn: () => taskService.getBackendTask(task!.id),
    enabled: Boolean(task),
    retry: false,
  });

  const detailTask = detailQuery.data ? mapBackendTask(detailQuery.data) : null;
  const assignMutation = useMutation({
    mutationFn: (user: OutletMember) => taskService.assignUser(task!.id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-assignments", task?.id ?? "none"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
      toast.success("Task berhasil ditugaskan.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menugaskan task.");
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => taskService.removeAssignment(task!.id, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-assignments", task?.id ?? "none"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
      toast.success("Penugasan dihapus.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus penugasan.");
    },
  });

  const assignedUserId = task?.assignedToId;
  const assignments = assignmentsQuery.data ?? [];
  const outletMembers = outletMembersQuery.data ?? [];
  const activeAssignee = assignments.find((assignment) => assignment.user_id === assignedUserId);
  const canReassign = !task?.execution && task?.status !== "Completed" && task?.status !== "Cancelled";

  const photoEvidence = useMemo(
    () =>
      (task?.execution?.evidence ?? [])
        .filter((evidence) => evidence.type === "photo" && evidence.value)
        .map((evidence) => ({
          url: evidence.value,
          caption: evidence.label ?? "Evidence photo",
        })),
    [task?.execution?.evidence]
  );

  if (!task) return null;

  const hasExecution = Boolean(task.execution);
  const hasDraft = Boolean(task.executionDraft);
  const checklist = task.execution?.checklist;
  const activities = detailTask?.activity ?? task.activity ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-slate-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Task Detail</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{task.outlet}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(task.status)}`}>
                {task.status}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getPriorityClass(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assignee</p>
                <p className="mt-1 font-medium text-slate-900">
                  {(activeAssignee?.user?.name ?? task.assignee) || "Unassigned"}
                </p>
                {canReassign ? (
                  <div className="mt-3">
                    <select
                      value={assignedUserId ?? ""}
                      disabled={assignMutation.isPending || outletMembersQuery.isLoading}
                      onChange={(event) => {
                        const userId = Number(event.target.value);
                        if (!userId) return;
                        const member = outletMembers.find((item) => item.id === userId);
                        if (member) assignMutation.mutate(member);
                      }}
                      className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    >
                      <option value="">Pilih penanggung jawab...</option>
                      {outletMembers.map((member) => (
                        <option key={member.id} value={String(member.id)}>
                          {member.name} {member.id === assignedUserId ? "(current)" : ""}
                        </option>
                      ))}
                    </select>
                    {assignments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {assignments.map((assignment) => (
                          <span
                            key={assignment.id}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                          >
                            <UserPlus className="size-3" />
                            {assignment.user?.name ?? `User ${assignment.user_id}`}
                            {assignment.user_id === assignedUserId ? (
                              <button
                                type="button"
                                disabled={removeAssignmentMutation.isPending}
                                onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                                className="ml-1 rounded-full px-1 text-blue-500 hover:bg-blue-100 disabled:opacity-50"
                                aria-label="Remove assignment"
                              >
                                <X className="size-3" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Due</p>
                <p className="mt-1 font-medium text-slate-900">{task.due || "No due date"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Schedule</p>
                <p className="mt-1 font-medium text-slate-900">{formatTaskSchedule(task)}</p>
              </div>
            </div>
            {task.description ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">{task.description}</p>
            ) : null}
            {onEdit || onDelete ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Edit Task
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                  >
                    Delete Task
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-950">Execution Evidence</h3>

            {hasExecution ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operator</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {task.execution?.operatorName} � {task.execution?.operatorPosition}
                  </p>
                  {task.execution?.completedAt ? (
                    <p className="mt-2 text-xs text-slate-500">Submitted {task.execution.completedAt}</p>
                  ) : null}
                  {task.execution?.note ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{task.execution.note}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {(task.execution?.evidence ?? []).map((evidence) => {
                    const evidenceStyle = getEvidenceStyle(evidence.type);
                    const EvidenceIcon = evidenceStyle.icon;
                    const isUrl = /^https?:\/\//i.test(evidence.value);
                    const photoIndex = photoEvidence.findIndex((item) => item.url === evidence.value);

                    return (
                      <div key={`${evidence.type}-${evidence.value}`} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${evidenceStyle.className}`}>
                            <EvidenceIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${evidenceStyle.className}`}>
                                {evidenceStyle.label}
                              </span>
                              <p className="text-xs text-slate-400">{evidence.submittedAt}</p>
                            </div>
                            <p className="mt-2 font-semibold text-slate-900">
                              {evidence.label ?? evidenceStyle.label}
                            </p>
                            {evidence.type === "photo" && evidence.value ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setLightboxIndex(Math.max(photoIndex, 0));
                                  setLightboxOpen(true);
                                }}
                                className="mt-2 block overflow-hidden rounded-xl border border-slate-200"
                              >
                                <EvidencePhotoPreview
                                  src={evidence.value}
                                  alt={evidence.label ?? "Evidence photo"}
                                />
                              </button>
                            ) : isUrl ? (
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
                            {evidence.latitude != null && evidence.longitude != null ? (
                              <a
                                href={`https://maps.google.com/?q=${evidence.latitude},${evidence.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                {evidence.latitude.toFixed(5)}, {evidence.longitude.toFixed(5)}
                              </a>
                            ) : null}
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

          {checklist ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-950">Checklist Scorecard</h3>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getChecklistStatusClass(checklist.status)}`}
                >
                  {checklist.status}
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{checklist.score}%</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">Passed</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-800">{checklist.passed_count}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs text-red-700">Failed</p>
                  <p className="mt-1 text-2xl font-bold text-red-800">{checklist.failed_count}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Scorable</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{checklist.total_scorable}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-xs text-slate-500">N/A</p>
                  <p className="mt-1 text-2xl font-bold text-slate-700">{checklist.na_count ?? 0}</p>
                </div>
              </div>

              {(checklist.critical_failures?.length ?? 0) > 0 ? (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Critical Failures
                  </p>
                  {(checklist.critical_failures ?? []).map((item) => (
                    <div
                      key={`critical-${item.field_id}-${item.label}`}
                      className="rounded-2xl border-2 border-red-300 bg-red-100 p-4"
                    >
                      <p className="font-bold text-red-950">{item.label}</p>
                      <p className="mt-1 text-sm text-red-800">Value: {item.value || "-"}</p>
                      <p className="mt-1 text-sm font-semibold text-red-700">{item.reason}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {checklist.failed_items.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Failed Items
                  </p>
                  {checklist.failed_items.map((item) => (
                    <div
                      key={`${item.field_id}-${item.label}`}
                      className="rounded-2xl border border-red-100 bg-red-50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-red-950">{item.label}</p>
                        {item.critical ? (
                          <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                            Kritis
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-red-800">
                        Value: {item.value || "-"}
                      </p>
                      <p className="mt-1 text-sm text-red-700">{item.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-emerald-700">All scorable checklist items passed.</p>
              )}
            </section>
          ) : null}

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

                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${activityStyle.className}`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{activity.title}</p>
                          <p className="text-xs text-slate-400">{activity.timestamp}</p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-400">Actor: {activity.actor}</p>
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

      <PhotoLightbox
        open={lightboxOpen}
        images={photoEvidence}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
