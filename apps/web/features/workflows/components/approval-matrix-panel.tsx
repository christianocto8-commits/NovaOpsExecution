"use client";

import { useState } from "react";

import {
  useApprovalMatrix,
  useApprovalMatrixMutations,
} from "@/features/workflows/hooks";
import type { UUID, WorkflowApprovalMatrix } from "@/features/workflows/types";
import {
  approvalMatrixToForm,
  buildApprovalMatrixCreatePayload,
  buildApprovalMatrixUpdatePayload,
  emptyApprovalMatrixForm,
  type ApprovalMatrixFormState,
} from "@/features/workflows/utils";

type ApprovalMatrixPanelProps = {
  workflowId: UUID;
};

export function ApprovalMatrixPanel({ workflowId }: ApprovalMatrixPanelProps) {
  const matrixQuery = useApprovalMatrix(workflowId);
  const mutations = useApprovalMatrixMutations(workflowId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<WorkflowApprovalMatrix | null>(null);
  const [form, setForm] = useState<ApprovalMatrixFormState>(emptyApprovalMatrixForm);
  const [error, setError] = useState("");

  const matrix = matrixQuery.data ?? [];
  const isSaving =
    mutations.createApprovalMatrix.isPending ||
    mutations.updateApprovalMatrix.isPending ||
    mutations.deleteApprovalMatrix.isPending;

  function openCreate() {
    setEditingMatrix(null);
    setForm({
      ...emptyApprovalMatrixForm,
      step_order: String(matrix.length + 1),
    });
    setError("");
    setFormOpen(true);
  }

  function openEdit(item: WorkflowApprovalMatrix) {
    setEditingMatrix(item);
    setForm(approvalMatrixToForm(item));
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditingMatrix(null);
    setError("");
  }

  function updateField<K extends keyof ApprovalMatrixFormState>(
    key: K,
    value: ApprovalMatrixFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveMatrix() {
    if (!form.step_order.trim()) {
      setError("Step order is required.");
      return;
    }

    try {
      setError("");

      if (editingMatrix) {
        await mutations.updateApprovalMatrix.mutateAsync({
          matrixId: editingMatrix.id,
          payload: buildApprovalMatrixUpdatePayload(form),
        });
      } else {
        await mutations.createApprovalMatrix.mutateAsync(
          buildApprovalMatrixCreatePayload(workflowId, form),
        );
      }

      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save approval matrix.");
    }
  }

  async function deleteMatrix(item: WorkflowApprovalMatrix) {
    const confirmed = window.confirm(
      `Delete approval step ${item.step_order}${item.step_name ? ` - ${item.step_name}` : ""}?`,
    );

    if (!confirmed) return;

    try {
      await mutations.deleteApprovalMatrix.mutateAsync(item.id);
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error ? deleteError.message : "Failed to delete approval matrix.",
      );
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-bold text-emerald-700">Approval Matrix</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Approval Steps</h3>
          <p className="mt-1 text-sm text-slate-500">
            Define who must approve each workflow step before the instance can continue.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Add Step
        </button>
      </div>

      {matrixQuery.isError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {matrixQuery.error instanceof Error
            ? matrixQuery.error.message
            : "Failed to load approval matrix."}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3">Role ID</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Approval Count</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {matrixQuery.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  Loading approval matrix...
                </td>
              </tr>
            ) : matrix.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  No approval steps yet.
                </td>
              </tr>
            ) : (
              matrix.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">Step {item.step_order}</p>
                    <p className="text-xs text-slate-500">{item.step_name ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {item.approver_role_id ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {item.approver_user_id ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.required_approval_count ?? 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {item.is_required === false ? "Optional" : "Required"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteMatrix(item)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4">
          <button
            type="button"
            aria-label="Close approval matrix form"
            className="absolute inset-0 cursor-default"
            onClick={closeForm}
          />

          <section className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {editingMatrix ? "Edit Approval Step" : "Add Approval Step"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">Approval Matrix</h3>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Step Order</span>
                  <input
                    type="number"
                    min={1}
                    value={form.step_order}
                    onChange={(event) => updateField("step_order", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Approval Count</span>
                  <input
                    type="number"
                    min={1}
                    value={form.required_approval_count}
                    onChange={(event) =>
                      updateField("required_approval_count", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Step Name</span>
                <input
                  value={form.step_name}
                  onChange={(event) => updateField("step_name", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                  placeholder="Example: Area Manager Review"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Approver Role ID</span>
                <input
                  value={form.approver_role_id}
                  onChange={(event) => updateField("approver_role_id", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                  placeholder="UUID role id"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Specific Approver User ID</span>
                <input
                  value={form.approver_user_id}
                  onChange={(event) => updateField("approver_user_id", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                  placeholder="Optional UUID user id"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(event) => updateField("is_required", event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">Required approval step</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveMatrix()}
                disabled={isSaving}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Step"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
