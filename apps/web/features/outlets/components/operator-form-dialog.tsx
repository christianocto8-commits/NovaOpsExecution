import { OperatorFormState, OperatorPosition, Outlet } from "../types";

type OperatorFormDialogProps = {
  open: boolean;
  editingOperatorId: string | null;
  form: OperatorFormState;
  outlets: Outlet[];
  onClose: () => void;
  onFormChange: (form: OperatorFormState) => void;
  onSave: () => void;
};

const positions: OperatorPosition[] = ["Head Barista", "Lead Barista", "Crew"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function OperatorFormDialog({
  open,
  editingOperatorId,
  form,
  outlets,
  onClose,
  onFormChange,
  onSave,
}: OperatorFormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-6">
          <p className="text-sm font-medium text-emerald-700">Outlet Operator</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {editingOperatorId ? "Edit Operator" : "Add Operator"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Operators are selected during task execution for audit tracking.
          </p>
        </div>

        <div className="grid gap-4 p-6">
          <Field label="Outlet">
            <select
              value={form.outletId}
              onChange={(event) => onFormChange({ ...form, outletId: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Operator Name">
            <input
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Operator name"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Position">
              <select
                value={form.position}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    position: event.target.value as OperatorPosition,
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {positions.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </Field>

            <Field label="PIN">
              <input
                value={form.pin}
                maxLength={6}
                onChange={(event) => onFormChange({ ...form, pin: event.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="1234"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => onFormChange({ ...form, active: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active operator
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            {editingOperatorId ? "Save Changes" : "Add Operator"}
          </button>
        </div>
      </div>
    </div>
  );
}
