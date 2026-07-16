import { Edit3, Plus, Trash2 } from "lucide-react";

import { Outlet, OutletOperator } from "../types";
import { getOutletStatusClass, getOutletTierClass } from "../utils";

type OutletDetailDrawerProps = {
  outlet: Outlet | null;
  operators: OutletOperator[];
  onClose: () => void;
  onAddOperator: (outletId: string) => void;
  onEditOperator: (operator: OutletOperator) => void;
  onDeleteOperator: (id: string) => void;
  canManage: boolean;
};

export function OutletDetailDrawer({
  outlet,
  operators,
  onClose,
  onAddOperator,
  onEditOperator,
  onDeleteOperator,
  canManage,
}: OutletDetailDrawerProps) {
  if (!outlet) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700">Outlet Profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{outlet.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {outlet.code} • {outlet.area || "No address"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getOutletStatusClass(
                  outlet.status
                )}`}
              >
                {outlet.status}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tier</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getOutletTierClass(
                  outlet.tier
                )}`}
              >
                {outlet.tier}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Compliance
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-800">{outlet.compliance}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Open Tasks
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{outlet.openTasks}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Outlet Contact
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {outlet.phone || "No phone set"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h3 className="font-semibold text-slate-950">Outlet Operators</h3>
                <p className="text-sm text-slate-500">
                  Operators are used for task execution audit.
                </p>
              </div>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => onAddOperator(outlet.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              ) : (
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  View only
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {operators.length > 0 ? (
                operators.map((operator) => (
                  <div key={operator.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold text-slate-950">{operator.name}</p>
                      <p className="text-sm text-slate-500">
                        {operator.position} • PIN {operator.pin}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          operator.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500",
                        ].join(" ")}
                      >
                        {operator.active ? "Active" : "Inactive"}
                      </span>

                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditOperator(operator)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                            title="Edit operator"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteOperator(operator.id)}
                            className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                            title="Delete operator"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-slate-500">
                  No operators registered for this outlet.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}