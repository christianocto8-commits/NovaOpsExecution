"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import {
  usePendingWorkflowInstances,
  useWorkflowMutations,
  useWorkflows,
} from "@/features/workflows/hooks";
import type { WorkflowInstance } from "@/features/workflows/types";
import { formatWorkflowDate } from "@/features/workflows/utils";
import { WorkflowInstanceDrawer } from "./workflow-instance-drawer";

const INBOX_STATUSES = new Set(["pending_approval", "submitted", "escalated"]);

function getStatusTone(status?: string) {
  switch (status) {
    case "escalated":
      return "bg-amber-50 text-amber-700";
    case "pending_approval":
    case "submitted":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

type ApprovalInboxPanelProps = {
  compact?: boolean;
  limit?: number;
};

export function ApprovalInboxPanel({ compact = false, limit = 5 }: ApprovalInboxPanelProps) {
  const instancesQuery = usePendingWorkflowInstances();
  const workflowsQuery = useWorkflows();
  const mutations = useWorkflowMutations();
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const workflows = workflowsQuery.data ?? [];
  const pendingInstances = useMemo(() => {
    return (instancesQuery.data ?? [])
      .filter((instance) => INBOX_STATUSES.has(String(instance.status).toLowerCase()))
      .sort(
        (first, second) =>
          new Date(second.updated_at ?? second.created_at ?? 0).getTime() -
          new Date(first.updated_at ?? first.created_at ?? 0).getTime()
      );
  }, [instancesQuery.data]);

  const visibleInstances = pendingInstances.slice(0, limit);

  function getWorkflowName(workflowId: string) {
    return workflows.find((workflow) => workflow.id === workflowId)?.name ?? workflowId;
  }

  async function runQuickAction(instance: WorkflowInstance, action: "approve" | "reject") {
    setActionError(null);

    try {
      const payload = {
        comment: null,
        payload_json: { source: "approval_inbox_panel" },
      };

      if (action === "approve") {
        await mutations.approveInstance.mutateAsync({ instanceId: instance.id, payload });
      } else {
        await mutations.rejectInstance.mutateAsync({ instanceId: instance.id, payload });
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update workflow instance.");
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Approval Inbox</p>
            <p className="mt-1 text-xs text-slate-500">
              Pending approvals scoped to your role and outlet.
            </p>
          </div>
          <Link
            href="/dashboard/workflows"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            All workflows
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {actionError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}

        {instancesQuery.isLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading approval inbox...</p>
        ) : visibleInstances.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No pending approvals assigned to you right now.
          </div>
        ) : (
          <div className={`mt-5 ${compact ? "space-y-2" : "space-y-3"}`}>
            {visibleInstances.map((instance) => (
              <article
                key={instance.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedInstance(instance)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{instance.entity_id}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusTone(
                          instance.status
                        )}`}
                      >
                        {instance.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {getWorkflowName(instance.workflow_id)} · {instance.module}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatWorkflowDate(instance.created_at)}
                    </p>
                  </button>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runQuickAction(instance, "approve")}
                      disabled={mutations.approveInstance.isPending || mutations.rejectInstance.isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void runQuickAction(instance, "reject")}
                      disabled={mutations.approveInstance.isPending || mutations.rejectInstance.isPending}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle className="size-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInstance(instance)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white/80"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {pendingInstances.length > limit ? (
          <p className="mt-4 text-xs font-semibold text-slate-500">
            {pendingInstances.length - limit} more pending in{" "}
            <Link href="/dashboard/workflows" className="text-emerald-700 hover:text-emerald-800">
              workflow center
            </Link>
            .
          </p>
        ) : null}
      </section>

      <WorkflowInstanceDrawer
        instance={selectedInstance}
        workflows={workflows}
        onClose={() => setSelectedInstance(null)}
      />
    </>
  );
}
