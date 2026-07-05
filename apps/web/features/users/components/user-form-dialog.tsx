import { UserFormState, UserRole, UserStatus } from "../types";

type UserFormDialogProps = {
  open: boolean;
  editingUserId: string | null;
  form: UserFormState;
  onClose: () => void;
  onFormChange: (form: UserFormState) => void;
  onSave: () => void;
};

const roles: UserRole[] = ["Owner/Admin", "Area Manager", "Outlet"];

const outletOptions = [
  "All Outlets",
  "KOV Montre",
  "KOV Heritage",
  "KOV Sultan Agung",
  "KOV Sula",
  "KOV Montre, KOV Heritage, KOV Sultan Agung",
];

const statuses: UserStatus[] = ["Active", "Pending", "Suspended"];

function getScopeLabel(role: UserRole) {
  if (role === "Owner/Admin") return "All Outlets";
  if (role === "Area Manager") return "Multiple Outlets";
  return "Single Outlet";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function UserFormDialog({
  open,
  editingUserId,
  form,
  onClose,
  onFormChange,
  onSave,
}: UserFormDialogProps) {
  if (!open) return null;

  const scopeLabel = getScopeLabel(form.role);

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
          <p className="text-sm font-medium text-emerald-700">Account Management</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {editingUserId ? "Edit Account" : "Create Account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage Owner/Admin, Area Manager, and Outlet account access.
          </p>
        </div>

        <div className="grid gap-4 p-6">
          <Field label="Account Name">
            <input
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Example: KOV Heritage"
            />
          </Field>

          <Field label="Email">
            <input
              value={form.email}
              onChange={(event) => onFormChange({ ...form, email: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="heritage@kov.co.id"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role">
              <select
                value={form.role}
                onChange={(event) => {
                  const role = event.target.value as UserRole;
                  onFormChange({
                    ...form,
                    role,
                    outletScope: getScopeLabel(role),
                    outlet: role === "Owner/Admin" ? "All Outlets" : form.outlet,
                  });
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    status: event.target.value as UserStatus,
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Outlet Scope">
            <input
              value={scopeLabel}
              readOnly
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
            />
          </Field>

          <Field label="Outlet Access">
            <select
              value={form.outlet}
              onChange={(event) => onFormChange({ ...form, outlet: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {outletOptions.map((outlet) => (
                <option key={outlet}>{outlet}</option>
              ))}
            </select>
          </Field>
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
            {editingUserId ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
