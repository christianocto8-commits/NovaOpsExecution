import type { WorkflowExecutionFormState } from "@/features/workflows/hooks";
import type { WorkflowDefinition } from "@/features/workflows/types";

type WorkflowExecutionDialogProps = {
  open: boolean;
  workflow: WorkflowDefinition | null;
  form: WorkflowExecutionFormState;
  error?: string;
  saving?: boolean;
  onChange: (form: WorkflowExecutionFormState) => void;
  onClose: () => void;
  onCreate: () => void;
};

export function WorkflowExecutionDialog({
  open,
  workflow,
  form,
  error,
  saving,
  onChange,
  onClose,
  onCreate,
}: WorkflowExecutionDialogProps) {
  if (!open || !workflow) return null;

  function updateField<K extends keyof WorkflowExecutionFormState>(
    key: K,
    value: WorkflowExecutionFormState[K]
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close workflow execution form"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">Execute Workflow</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{workflow.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a workflow instance linked to a NovaOps business entity.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
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

          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Module</span>
                <input
                  value={form.module}
                  onChange={(event) => updateField("module", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Entity Type</span>
                <input
                  value={form.entity_type}
                  onChange={(event) => updateField("entity_type", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Entity ID</span>
                <input
                  value={form.entity_id}
                  onChange={(event) => updateField("entity_id", event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Context JSON</span>
              <textarea
                value={form.contextText}
                onChange={(event) => updateField("contextText", event.target.value)}
                className="min-h-56 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none focus:border-emerald-600"
                spellCheck={false}
              />
            </label>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onCreate}
            disabled={saving}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Instance"}
          </button>
        </div>
      </section>
    </div>
  );
}
