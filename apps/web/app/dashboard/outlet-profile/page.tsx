"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Phone, ShieldCheck, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query/keys";
import {
  getIdentityOutletMetrics,
  getIdentityOutletOperators,
  getIdentityOutlets,
  type IdentityOutlet,
} from "@/services/identity.service";

function getAccessibleOutletIds(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return [];
  if (user.outlet_access.scope === "all") return [];
  if (user.outlet_access.outlet_id) return [user.outlet_access.outlet_id];
  return user.outlet_access.outlet_ids;
}

function formatDate(value: string | null) {
  if (!value) return "No audit recorded";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default function OutletProfilePage() {
  const { user } = useAuth();
  const accessibleOutletIds = useMemo(() => getAccessibleOutletIds(user), [user]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });

  const metricsQuery = useQuery({
    queryKey: queryKeys.identity.outletMetrics,
    queryFn: getIdentityOutletMetrics,
    retry: false,
  });

  const availableOutlets = useMemo(() => {
    const outlets = outletsQuery.data ?? [];

    if (accessibleOutletIds.length === 0) return outlets;

    return outlets.filter((outlet) => accessibleOutletIds.includes(outlet.id));
  }, [accessibleOutletIds, outletsQuery.data]);

  const activeOutletId =
    selectedOutletId ||
    availableOutlets[0]?.id ||
    accessibleOutletIds[0] ||
    user?.outlet_access.outlet_id ||
    "";

  const activeOutlet: IdentityOutlet | null =
    availableOutlets.find((outlet) => outlet.id === activeOutletId) ?? null;

  const operatorsQuery = useQuery({
    queryKey: [...queryKeys.identity.operators, activeOutletId],
    queryFn: () => getIdentityOutletOperators(activeOutletId),
    enabled: Boolean(activeOutletId),
    retry: false,
  });

  const metrics =
    metricsQuery.data?.find((item) => item.outlet_id === activeOutletId) ?? null;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Outlet Account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Outlet Profile
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Data below is loaded from the active login, outlet registry, operators, and outlet
            metrics.
          </p>
        </div>

        {availableOutlets.length > 1 ? (
          <select
            value={activeOutletId}
            onChange={(event) => setSelectedOutletId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-emerald-600"
          >
            {availableOutlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {outletsQuery.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Outlet registry is not available for this account. Showing available login context only.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open Tasks" value={metrics?.open_tasks ?? "-"} />
        <StatCard label="Completed Today" value={metrics?.completed_today ?? "-"} />
        <StatCard
          label="Compliance"
          value={metrics ? `${Math.round(metrics.compliance)}%` : "-"}
        />
        <StatCard label="Active Operators" value={metrics?.active_operators ?? "-"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Outlet Identity
              </p>
              <h2 className="text-xl font-bold text-slate-950">
                {activeOutlet?.name ?? "Outlet linked to this account"}
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Outlet Code
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {activeOutlet?.code ?? activeOutletId}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {activeOutlet?.status ?? "Active account"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Phone
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Phone className="size-4 text-slate-400" />
                {activeOutlet?.phone ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last Audit
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="size-4 text-slate-400" />
                {formatDate(metrics?.last_audit ?? null)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Address
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {activeOutlet?.address ?? "Address has not been set in outlet registry."}
            </p>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">Outlet Operators</p>
              <p className="text-xs text-slate-500">
                {operatorsQuery.data?.length ?? 0} registered
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {operatorsQuery.isLoading ? (
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                Loading operators...
              </div>
            ) : operatorsQuery.data?.length ? (
              operatorsQuery.data.map((operator) => (
                <div key={operator.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{operator.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{operator.position}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        operator.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {operator.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No operators registered for this outlet yet.
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
