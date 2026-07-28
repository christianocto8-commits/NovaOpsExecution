import { Outlet } from "../types";
import { getOutletStatusClass, getOutletTierClass } from "../utils";

type OutletDetailDrawerProps = {
  outlet: Outlet | null;
  onClose: () => void;
};

export function OutletDetailDrawer({ outlet, onClose }: OutletDetailDrawerProps) {
  if (!outlet) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative z-10 h-dvh w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700">Outlet Profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{outlet.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {outlet.code} - {outlet.area || "No area"}
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

        <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
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
        </div>
      </aside>
    </div>
  );
}
