"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, ImageIcon, Search, X, XCircle } from "lucide-react";

import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import { useEvidenceDisplayUrl } from "@/shared/evidence/hooks/use-evidence-display-url";
import {
  collectSubmissionEvidenceItems,
} from "@/shared/evidence/submission-evidence";
import { isTaskWorkedOn } from "@/features/tasks/utils/task-inbox";
import { useLanguage } from "@/shared/i18n";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import type { OutletScopeContext } from "@/shared/navigation/outlet-scope";

export type ReviewEvidenceItem = {
  id: string;
  url: string;
  caption: string;
  taskId: string;
  taskTitle: string;
  outlet: string;
  submittedAt: string;
  source: "execution" | "form";
  reviewStatus?: "approved" | "rejected" | "pending";
};

function normalizeReviewStatus(
  status?: import("@/features/tasks/types").TaskReviewStatus
): ReviewEvidenceItem["reviewStatus"] {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

type EvidenceReviewHubProps = {
  tasks: Task[];
  workspace: OutletScopeContext;
  title?: string;
  description?: string;
};

function isPhotoOrUrlEvidence(type: string) {
  return type === "photo" || type === "url";
}

function extractEvidenceFromTasks(tasks: Task[]): ReviewEvidenceItem[] {
  const items: ReviewEvidenceItem[] = [];

  tasks.forEach((task) => {
    const execution = task.execution;
    if (!execution) return;

    const submissionItems = collectSubmissionEvidenceItems({
      formResponses: execution.formResponses,
      taskEvidence: execution.evidence.filter((item) => isPhotoOrUrlEvidence(item.type)),
    });

    submissionItems.forEach((item) => {
      items.push({
        id: `${task.id}-${item.id}`,
        url: item.url,
        caption: item.caption ?? "Evidence",
        taskId: task.id,
        taskTitle: task.title,
        outlet: task.outlet,
        submittedAt: item.uploadedAt || execution.completedAt,
        source: item.id.startsWith("form-") ? "form" : "execution",
        reviewStatus: normalizeReviewStatus(task.execution?.reviewStatus),
      });
    });
  });

  return items.sort(
    (first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()
  );
}

function ReviewEvidenceCard({
  item,
  t,
  onOpen,
}: {
  item: ReviewEvidenceItem;
  t: (key: string) => string;
  onOpen: () => void;
}) {
  const displayUrl = useEvidenceDisplayUrl(item.url);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={item.caption}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="size-8 text-slate-300" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">{item.taskTitle}</p>
          <ReviewStatusPill status={item.reviewStatus ?? "pending"} t={t} />
        </div>
        <p className="truncate text-xs text-slate-500">
          {item.outlet} · {item.source}
        </p>
        <p className="text-[11px] text-slate-400">
          {new Date(item.submittedAt).toLocaleString()}
        </p>
      </div>
    </button>
  );
}

function ReviewEvidenceLightboxImage({ item }: { item: ReviewEvidenceItem }) {
  const displayUrl = useEvidenceDisplayUrl(item.url);

  if (!displayUrl) {
    return (
      <div className="flex max-h-[70vh] min-h-64 items-center justify-center bg-slate-900">
        <ImageIcon className="size-10 text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={item.caption}
      className="max-h-[70vh] w-full object-contain"
    />
  );
}

function ReviewStatusPill({
  status,
  t,
}: {
  status: "approved" | "rejected" | "pending";
  t: (key: string) => string;
}) {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : null;

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
      {Icon ? <Icon className="size-3" /> : null}
      {status === "approved"
        ? t("evidence.statusApproved")
        : status === "rejected"
          ? t("evidence.statusRejected")
          : t("evidence.statusPending")}
    </span>
  );
}

export function EvidenceReviewHub({
  tasks,
  workspace,
  title = "Evidence Review",
  description = "Photo and URL evidence collected from completed task submissions.",
}: EvidenceReviewHubProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "execution" | "form">("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const reviewMutation = useMutation({
    mutationFn: ({
      taskId,
      review,
    }: {
      taskId: string;
      review: "approved" | "rejected";
    }) => taskService.review(taskId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    },
  });

  const scopedTasks = useMemo(
    () => filterTasksForWorkspace(tasks, workspace).filter(isTaskWorkedOn),
    [tasks, workspace]
  );

  const evidenceItems = useMemo(() => extractEvidenceFromTasks(scopedTasks), [scopedTasks]);

  const outletOptions = useMemo(() => {
    const outlets = new Set(evidenceItems.map((item) => item.outlet).filter(Boolean));
    return Array.from(outlets).sort((a, b) => a.localeCompare(b));
  }, [evidenceItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return evidenceItems.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (outletFilter !== "all" && item.outlet !== outletFilter) return false;
      if (statusFilter !== "all" && (item.reviewStatus ?? "pending") !== statusFilter) return false;
      if (!normalizedQuery) return true;

      return (
        item.taskTitle.toLowerCase().includes(normalizedQuery) ||
        item.outlet.toLowerCase().includes(normalizedQuery) ||
        item.caption.toLowerCase().includes(normalizedQuery) ||
        item.taskId.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [evidenceItems, query, sourceFilter, outletFilter, statusFilter]);

  const activeItem = lightboxIndex != null ? filteredItems[lightboxIndex] ?? null : null;

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function showPrevious() {
    if (lightboxIndex == null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  }

  function showNext() {
    if (lightboxIndex == null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("evidence.searchPlaceholder")}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <select
          value={outletFilter}
          onChange={(event) => setOutletFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="all">{t("evidence.allOutlets")}</option>
          {outletOptions.map((outlet) => (
            <option key={outlet} value={outlet}>
              {outlet}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="all">{t("evidence.allSources")}</option>
          <option value="execution">{t("evidence.sourceExecution")}</option>
          <option value="form">{t("evidence.sourceForm")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="all">{t("evidence.allStatuses")}</option>
          <option value="approved">{t("evidence.statusApproved")}</option>
          <option value="rejected">{t("evidence.statusRejected")}</option>
          <option value="pending">{t("evidence.statusPending")}</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <ImageIcon className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">{t("evidence.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("evidence.emptyBody")}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item, index) => (
            <ReviewEvidenceCard
              key={item.id}
              item={item}
              t={t}
              onOpen={() => openLightbox(index)}
            />
          ))}
        </div>
      )}

      {activeItem ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4">
          <button
            type="button"
            aria-label="Close lightbox"
            className="absolute inset-0"
            onClick={closeLightbox}
          />
          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <p className="text-sm font-bold text-slate-950">{activeItem.taskTitle}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {activeItem.outlet} · Task {activeItem.taskId} · {activeItem.source}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="relative bg-slate-950">
              <ReviewEvidenceLightboxImage item={activeItem} />
              <button
                type="button"
                onClick={showPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 p-4 text-sm text-slate-600">
              <span>{activeItem.caption}</span>
              <span>{new Date(activeItem.submittedAt).toLocaleString()}</span>
            </div>
            {(activeItem.reviewStatus ?? "pending") === "pending" ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() =>
                    reviewMutation.mutate({ taskId: activeItem.taskId, review: "approved" })
                  }
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <CheckCircle2 className="size-4" />
                  {t("evidence.approve")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    reviewMutation.mutate({ taskId: activeItem.taskId, review: "rejected" })
                  }
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <XCircle className="size-4" />
                  {t("evidence.reject")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
