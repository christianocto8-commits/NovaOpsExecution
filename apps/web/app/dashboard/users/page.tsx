"use client";

export default function DashboardUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Access Module</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Users
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          User access, roles, permissions, and team management.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Users module restored inside Enterprise Dashboard Shell.
        </p>
      </div>
    </div>
  );
}