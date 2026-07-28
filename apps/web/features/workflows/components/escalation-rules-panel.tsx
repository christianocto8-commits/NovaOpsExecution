"use client";

import { useState } from "react";

import { useEscalationMutations, useEscalationRules } from "@/features/workflows/hooks";
import type { UUID, WorkflowEscalationRule } from "@/features/workflows/types";
import {
  buildEscalationRuleCreatePayload,
  buildEscalationRuleUpdatePayload,
  emptyEscalationRuleForm,
  escalationRuleToForm,
  type EscalationRuleFormState,
} from "@/features/workflows/utils";

type EscalationRulesPanelProps = {
  workflowId: UUID;
};

export function EscalationRulesPanel({ workflowId }: EscalationRulesPanelProps) {
  const rulesQuery = useEscalationRules(workflowId);
  const mutations = useEscalationMutations(workflowId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowEscalationRule | null>(null);
  const [form, setForm] = useState<EscalationRuleFormState>(emptyEscalationRuleForm);
  const [error, setError] = useState("");

  const rules = rulesQuery.data ?? [];

  const isSaving =
    mutations.createEscalationRule.isPending ||
    mutations.updateEscalationRule.isPending ||
    mutations.deleteEscalationRule.isPending ||
    mutations.processEscalations.isPending ||
    mutations.assignDueDates.isPending;

  function openCreate() {
    setEditingRule(null);
    setForm({
      ...emptyEscalationRuleForm,
      step_order: String(rules.length + 1),
    });
    setError("");
    setFormOpen(true);
  }

  function openEdit(rule: WorkflowEscalationRule) {
    setEditingRule(rule);
    setForm(escalationRuleToForm(rule));
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditingRule(null);
    setError("");
  }

  function updateField<K extends keyof EscalationRuleFormState>(
    key: K,
    value: EscalationRuleFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveRule() {
    if (!form.step_order.trim()) {
      setError("Step order is required.");
      return;
    }

    if (!form.trigger_after_minutes.trim()) {
      setError("Trigger after minutes is required.");
      return;
    }

    try {
      setError("");

      if (editingRule) {
        await mutations.updateEscalationRule.mutateAsync({
          ruleId: editingRule.id,
          payload: buildEscalationRuleUpdatePayload(form),
        });
      } else {
        await mutations.createEscalationRule.mutateAsync(
          buildEscalationRuleCreatePayload(workflowId, form)
        );
      }

      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save escalation rule.");
    }
  }

  async function deleteRule(rule: WorkflowEscalationRule) {
    const confirmed = window.confirm(`Delete escalation rule "${rule.name ?? rule.id}"?`);
    if (!confirmed) return;

    try {
      await mutations.deleteEscalationRule.mutateAsync(rule.id);
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error ? deleteError.message : "Failed to delete escalation rule."
      );
    }
  }

  async function assignDueDates() {
    try {
      const result = await mutations.assignDueDates.mutateAsync();
      window.alert(`Due dates assigned: ${result.due_dates_assigned}`);
    } catch (processError) {
      window.alert(
        processError instanceof Error ? processError.message : "Failed to assign due dates."
      );
    }
  }

  async function processEscalations() {
    try {
      const result = await mutations.processEscalations.mutateAsync();
      window.alert(JSON.stringify(result, null, 2));
    } catch (processError) {
      window.alert(
        processError instanceof Error ? processError.message : "Failed to process escalations."
      );
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <p className="text-sm font-bold text-emerald-700">Escalation Rules</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">SLA & Auto Escalation</h3>
          <p className="mt-1 text-sm text-slate-500">
            Define when delayed workflow steps should escalate to another approver or role.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void assignDueDates()}
            disabled={isSaving}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Assign Due Dates
          </button>

          <button
            type="button"
            onClick={() => void processEscalations()}
            disabled={isSaving}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            Process Escalation
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={isSaving}
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Add Rule
          </button>
        </div>
      </div>

      {rulesQuery.isError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {rulesQuery.error instanceof Error
            ? rulesQuery.error.message
            : "Failed to load escalation rules."}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Escalate Role</th>
              <th className="px-4 py-3">Escalate User</th>
              <th className="px-4 py-3">Notification</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rulesQuery.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  Loading escalation rules...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  No escalation rules yet.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">Step {rule.step_order ?? "-"}</p>
                    <p className="text-xs text-slate-500">{rule.name ?? "-"}</p>
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {rule.trigger_after_minutes ?? "-"} min
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {rule.escalate_to_role_id ?? "-"}
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {rule.escalate_to_user_id ?? "-"}
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {rule.notification_template_id ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        rule.is_active === false
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {rule.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteRule(rule)}
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/30 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close escalation rule form"
            className="absolute inset-0 cursor-default"
            onClick={closeForm}
          />

          <section className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-700">
                  {editingRule ? "Edit Escalation Rule" : "Add Escalation Rule"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">SLA Escalation</h3>
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

            <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
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
                    <span className="text-sm font-bold text-slate-700">Trigger After Minutes</span>
                    <input
                      type="number"
                      min={1}
                      value={form.trigger_after_minutes}
                      onChange={(event) => updateField("trigger_after_minutes", event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Rule Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                    placeholder="Example: Escalate to Area Manager after 2 hours"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Escalate To Role ID</span>
                  <input
                    value={form.escalate_to_role_id}
                    onChange={(event) => updateField("escalate_to_role_id", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                    placeholder="Optional UUID role id"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Escalate To User ID</span>
                  <input
                    value={form.escalate_to_user_id}
                    onChange={(event) => updateField("escalate_to_user_id", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                    placeholder="Optional UUID user id"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">Notification Template ID</span>
                  <input
                    value={form.notification_template_id}
                    onChange={(event) =>
                      updateField("notification_template_id", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                    placeholder="Optional UUID template id"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => updateField("is_active", event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-bold text-slate-700">Active escalation rule</span>
                </label>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
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
                onClick={() => void saveRule()}
                disabled={isSaving}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Rule"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
