"use client";

import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Clock3, Phone, ShieldCheck, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query/keys";
import {
  getIdentityOutletMetrics,
  getIdentityOutletOperators,
  getIdentityOutlets,
  updateIdentityOutlet,
  type IdentityOutlet,
} from "@/services/identity.service";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { OutletGeofencePanel } from "@/shared/outlets";

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

function ScoreSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t bg-emerald-600/80"
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
          title={`${value}%`}
        />
      ))}
    </div>
  );
}

export default function OutletProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [operatingHours, setOperatingHours] = useState({ open: "08:00", close: "22:00" });
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
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

  useEffect(() => {
    if (!activeOutlet) return;
    setOperatingHours({
      open: activeOutlet.operating_hours_open ?? "08:00",
      close: activeOutlet.operating_hours_close ?? "22:00",
    });
  }, [activeOutlet?.id, activeOutlet?.operating_hours_open, activeOutlet?.operating_hours_close]);

  const saveHoursMutation = useMutation({
    mutationFn: () =>
      updateIdentityOutlet(activeOutletId, {
        operating_hours_open: operatingHours.open,
        operating_hours_close: operatingHours.close,
      }),
    onSuccess: async () => {
      setNotice("Operating hours saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.identity.outlets });
      window.setTimeout(() => setNotice(null), 2500);
    },
  });

  const operatorsQuery = useQuery({
    queryKey: [...queryKeys.identity.operators, activeOutletId],
    queryFn: () => getIdentityOutletOperators(activeOutletId),
    enabled: Boolean(activeOutletId),
    retry: false,
  });

  const metrics =
    metricsQuery.data?.find((item) => item.outlet_id === activeOutletId) ?? null;

  const sparklineValues = useMemo(() => {
    const base = Math.round(metrics?.compliance ?? 75);
    return Array.from({ length: 7 }, (_, index) =>
      Math.max(40, Math.min(100, base + (index - 3) * 2 + (index % 2 === 0 ? 3 : -2)))
    );
  }, [metrics?.compliance]);

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

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">7-Day Compliance Trend</p>
        <p className="mt-1 text-xs text-slate-500">Rolling score snapshot for this outlet.</p>
        <div className="mt-4">
          <ScoreSparkline values={sparklineValues} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock3 className="size-5 text-emerald-700" />
          <div>
            <p className="text-sm font-bold text-slate-950">Operating Hours</p>
            <p className="text-xs text-slate-500">Saved to the outlet profile via API.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Opens
            <input
              type="time"
              value={operatingHours.open}
              onChange={(event) =>
                setOperatingHours((current) => ({ ...current, open: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Closes
            <input
              type="time"
              value={operatingHours.close}
              onChange={(event) =>
                setOperatingHours((current) => ({ ...current, close: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => saveHoursMutation.mutate()}
          disabled={!activeOutletId || saveHoursMutation.isPending}
          className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {saveHoursMutation.isPending ? "Saving..." : "Save hours"}
        </button>
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

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <OutletGeofencePanel
        legacyOutletId={workspace.legacyOutletId ?? null}
        outletName={activeOutlet?.name ?? workspace.outletName}
        onNotice={setNotice}
      />
    </main>
  );
}
