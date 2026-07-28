"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef } from "react";

import { UserFormState, UserRole, UserStatus } from "../types";

type OutletOption = {
  id: string;
  name: string;
};

type UserFormDialogProps = {
  open: boolean;
  editingUserId: string | null;
  form: UserFormState;
  outletOptions: OutletOption[];
  onClose: () => void;
  onFormChange: (form: UserFormState) => void;
  onSave: () => void;
};

const roles: UserRole[] = ["Owner/Admin", "Area Manager", "Finance", "Outlet"];
const statuses: UserStatus[] = ["Active", "Pending", "Suspended"];

function getScopeLabel(role: UserRole) {
  if (role === "Owner/Admin") return "All Outlets";
  if (role === "Area Manager" || role === "Finance") return "Multiple Outlets";
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
  outletOptions,
  onClose,
  onFormChange,
  onSave,
}: UserFormDialogProps) {
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    pushedHistoryRef.current = true;
    window.history.pushState({ novaopsForm: "user" }, "", window.location.href);

    function handlePopState() {
      pushedHistoryRef.current = false;
      onClose();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose, open]);

  if (!open) return null;

  const scopeLabel = getScopeLabel(form.role);

  function handleClose() {
    if (pushedHistoryRef.current && typeof window !== "undefined") {
      pushedHistoryRef.current = false;
      window.history.back();
      return;
    }

    onClose();
  }

  function toggleAreaOutlet(outletId: string) {
    const exists = form.outletIds.includes(outletId);

    onFormChange({
      ...form,
      outletIds: exists
        ? form.outletIds.filter((id) => id !== outletId)
        : [...form.outletIds, outletId],
      outlet: "Multiple Outlets",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-white sm:items-center sm:bg-slate-950/40 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 hidden cursor-default sm:block"
        onClick={handleClose}
      />

      <div className="relative z-10 flex h-dvh w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4 sm:static sm:p-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 active:bg-slate-100 sm:hidden"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700">Account Management</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {editingUserId ? "Edit Account" : "Create Account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Owner/Admin gets all outlets, Area Manager and Finance can manage selected outlets, and Outlet
            account is restricted to one outlet.
          </p>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6">
          <Field label="Account Name">
            <input
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Example: KOV Heritage"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email">
              <input
                value={form.email}
                onChange={(event) => onFormChange({ ...form, email: event.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="heritage@kov.co.id"
              />
            </Field>

            <Field label="Username">
              <input
                value={form.username}
                onChange={(event) => onFormChange({ ...form, username: event.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="heritage01"
              />
            </Field>
          </div>

          <Field label={editingUserId ? "Reset Password" : "Initial Password"}>
            <input
              type="text"
              value={form.password}
              onChange={(event) => onFormChange({ ...form, password: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder={editingUserId ? "Leave blank to keep current password" : "Minimum 8 characters"}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role">
              <select
                value={form.role}
                onChange={(event) => {
                  const role = event.target.value as UserRole;
                  const firstOutlet = outletOptions[0];

                  onFormChange({
                    ...form,
                    role,
                    outletScope: getScopeLabel(role),
                    outlet:
                      role === "Owner/Admin"
                        ? "All Outlets"
                        : role === "Area Manager" || role === "Finance"
                          ? "Multiple Outlets"
                          : (firstOutlet?.id ?? ""),
                    outletIds: [],
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

          {form.role === "Owner/Admin" ? (
            <Field label="Outlet Access">
              <input
                value="All Outlets"
                readOnly
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
              />
            </Field>
          ) : null}

          {form.role === "Outlet" ? (
            <Field label="Outlet Access">
              <select
                value={form.outlet}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    outlet: event.target.value,
                    outletIds: [],
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {outletOptions.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {form.role === "Area Manager" || form.role === "Finance" ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Managed Outlets
              </span>

              <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
                {outletOptions.map((outlet) => (
                  <label key={outlet.id} className="flex items-center gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.outletIds.includes(outlet.id)}
                      onChange={() => toggleAreaOutlet(outlet.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    {outlet.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white p-4 sm:static sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex-none sm:py-2"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:flex-none sm:py-2"
          >
            {editingUserId ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
