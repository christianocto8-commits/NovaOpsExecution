"use client";

import { useState } from "react";

import {
  useWorkflowInstanceHistory,
  useWorkflowInstanceSteps,
  useWorkflowMutations,
} from "@/features/workflows/hooks";
import type { WorkflowDefinition, WorkflowInstance } from "@/features/workflows/types";
import { formatWorkflowDate } from "@/features/workflows/utils";

type WorkflowInstanceDrawerProps = {
  instance: WorkflowInstance | null;
  workflows: WorkflowDefinition[];
  onClose: () => void;
};

function getWorkflowName(workflows: WorkflowDefinition[], workflowId?: string) {
  if (!workflowId) return "-";
  return workflows.find((workflow) => workflow.id === workflowId)?.name ?? workflowId;
}

export function WorkflowInstanceDrawer({
  instance,
  workflows,
  onClose,
}: WorkflowInstanceDrawerProps) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const stepsQuery = useWorkflowInstanceSteps(instance?.id);
  const historyQuery = useWorkflowInstanceHistory(instance?.id);
  const mutations = useWorkflowMutations();

  if (!instance) return null;

  const isBusy =
    mutations.approveInstance.isPending ||
    mutations.rejectInstance.isPending ||
    mutations.returnInstance.isPending ||
    mutations.cancelInstance.isPending;

  async function runAction(action: "approve" | "reject" | "return" | "cancel") {
    if (!instance) return;

    const instanceId = instance.id;
    const payload = {
      comment: comment.trim() || null,
      payload_json: {
        source: "workflow_instance_drawer",
      },
    };

    try {
      setError("");

      const Context = {
        comment: comment.trim() || null,
        metadata: {
          source: "workflow_instance_drawer",
        },
      };

      if (action === "approve") {
        await mutations.approveInstance.mutateAsync({ instanceId, payload });
      }

      if (action === "reject") {
        await mutations.rejectInstance.mutateAsync({ instanceId, payload });
      }

      if (action === "return") {
        await mutations.returnInstance.mutateAsync({ instanceId, payload });
      }

      if (action === "cancel") {
        await mutations.cancelInstance.mutateAsync({ instanceId, payload });
      }

      setComment("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Workflow action failed.");
    }
  }

  const steps = stepsQuery.data ?? [];
  const history = historyQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close workflow instance"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative h-full w-full max-w-5xl overflow-y-auto bg-slate-50 p-6 shadow-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Workflow Instance</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {instance.entity_id}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {getWorkflowName(workflows, instance.workflow_id)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-1 font-semibold text-slate-950">{instance.status}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Current Step
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {instance.current_step_id ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Created</p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatWorkflowDate(instance.created_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Submitted</p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatWorkflowDate(instance.submitted_at)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Context</p>
            <pre className="mt-2 max-h-52 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(instance.context_json ?? {}, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold text-emerald-700">Actions</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Review decision</h3>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder="Add reviewer comment..."
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          />

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction("approve")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Approve
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction("return")}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              Return
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction("reject")}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              Reject
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction("cancel")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel Instance
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-emerald-700">Steps</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">Instance steps</h3>

            <div className="mt-4 space-y-3">
              {stepsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading steps...</p>
              ) : steps.length === 0 ? (
                <p className="text-sm text-slate-500">No steps found.</p>
              ) : (
                steps.map((step) => (
                  <div key={step.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-950">Step {step.sequence ?? "-"}</p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {step.status ?? "-"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Due: {formatWorkflowDate(step.due_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Completed: {formatWorkflowDate(step.completed_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-emerald-700">History</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">Approval timeline</h3>

            <div className="mt-4 space-y-3">
              {historyQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500">No approval history yet.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-950">{item.action_type}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.comment ?? "No comment."}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatWorkflowDate(item.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}




