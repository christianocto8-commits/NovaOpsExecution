"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef } from "react";

import { OutletFormState, OutletStatus, OutletTier } from "../types";

type OutletFormDialogProps = {
  open: boolean;
  editingOutletId: string | null;
  form: OutletFormState;
  onClose: () => void;
  onFormChange: (form: OutletFormState) => void;
  onSave: () => void;
};

const statuses: OutletStatus[] = ["Online", "Review", "Offline"];
const tiers: OutletTier[] = ["Flagship", "Standard", "Express"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function OutletFormDialog({
  open,
  editingOutletId,
  form,
  onClose,
  onFormChange,
  onSave,
}: OutletFormDialogProps) {
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    pushedHistoryRef.current = true;
    window.history.pushState({ novaopsForm: "outlet" }, "", window.location.href);

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

  function handleClose() {
    if (pushedHistoryRef.current && typeof window !== "undefined") {
      pushedHistoryRef.current = false;
      window.history.back();
      return;
    }

    onClose();
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
              <p className="text-sm font-medium text-emerald-700">Outlet Management</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {editingOutletId ? "Edit Outlet" : "Create Outlet"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage real outlet identity saved to the backend.
              </p>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6">
          <Field label="Outlet Code">
            <input
              value={form.code}
              onChange={(event) =>
                onFormChange({ ...form, code: event.target.value.toUpperCase() })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Example: KOV-HERITAGE"
            />
          </Field>

          <Field label="Outlet Name">
            <input
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="KOV Heritage"
            />
          </Field>

          <Field label="Area">
            <input
              value={form.area}
              onChange={(event) => onFormChange({ ...form, area: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Semarang"
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) => onFormChange({ ...form, phone: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="+62..."
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    status: event.target.value as OutletStatus,
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>

            <Field label="Tier">
              <select
                value={form.tier}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    tier: event.target.value as OutletTier,
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {tiers.map((tier) => (
                  <option key={tier}>{tier}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            Outlet account login is created separately from Accounts. After this outlet is saved,
            create an Outlet role account and assign it to this outlet.
          </div>
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
            {editingOutletId ? "Save Changes" : "Create Outlet"}
          </button>
        </div>
      </div>
    </div>
  );
}
