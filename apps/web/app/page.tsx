"use client";

import { OutletSwitcher } from "@/features/outlets/components/outlet-switcher";

export default function DashboardPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-950">
          NovaOps Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Enterprise operational command center.
        </p>
      </div>

      <OutletSwitcher />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Open Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">24</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completion Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">86%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Compliance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">91%</p>
        </div>
      </div>
    </main>
  );
}