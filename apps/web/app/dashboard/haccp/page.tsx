"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Plus, Trash2, Thermometer, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { getIdentityOutlets, type IdentityOutlet } from "@/services/identity.service";
import {
  createHaccpEntry,
  deleteHaccpEntry,
  getHaccpCcps,
  getHaccpSummary,
  listHaccpEntries,
  type HaccpLogEntry,
  type HaccpLogPayload,
} from "@/services/haccp.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { useToast } from "@/shared/toast";

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function HaccpPageContent() {
  const auth = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isOutletWorkspace = workspace.mode === "outlet";
  const canExecute = auth.can("task.execute");
  const [outletFilter, setOutletFilter] = useState("");
  const [ccpFilter, setCcpFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<HaccpLogPayload>({
    outlet_id: auth.user?.outlet_access.outlet_id ?? "",
    ccp_name: "",
    item_name: "",
    reading_value: 0,
    unit: "°C",
    corrective_action: "",
    verification_notes: "",
    source: "manual",
    recorded_at: localDateTimeValue(),
  });

  const entriesQuery = useQuery({
    queryKey: ["haccp-entries", outletFilter, ccpFilter],
    queryFn: () =>
      listHaccpEntries({
        outlet_id: outletFilter || undefined,
        ccp_name: ccpFilter || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["haccp-summary"],
    queryFn: getHaccpSummary,
    enabled: !isOutletWorkspace,
  });
  const ccpsQuery = useQuery({
    queryKey: ["haccp-ccps"],
    queryFn: getHaccpCcps,
  });
  const outletsQuery = useQuery({
    queryKey: ["identity-outlets", "haccp"],
    queryFn: getIdentityOutlets,
    enabled: auth.can("outlet.read"),
  });

  const outlets = useMemo<IdentityOutlet[]>(() => {
    if (outletsQuery.data?.length) return outletsQuery.data;
    return auth.user?.outlet_access.outlets ?? [];
  }, [auth.user?.outlet_access.outlets, outletsQuery.data]);

  const ccps = ccpsQuery.data?.ccps ?? [];
  const entries = entriesQuery.data ?? [];
  const summary = summaryQuery.data;

  useEffect(() => {
    if (!isOutletWorkspace) return;
    const outletId = workspace.outletId || auth.user?.outlet_access.outlet_id || "";
    if (!outletId) return;
    setForm((current) =>
      current.outlet_id === outletId ? current : { ...current, outlet_id: outletId }
    );
  }, [auth.user?.outlet_access.outlet_id, isOutletWorkspace, workspace.outletId]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["haccp-entries"] });
    await queryClient.invalidateQueries({ queryKey: ["haccp-summary"] });
  };

  const createMutation = useMutation({
    mutationFn: createHaccpEntry,
    onSuccess: async () => {
      toast.success("Log HACCP disimpan.");
      setShowCreate(false);
      setForm({
        outlet_id: auth.user?.outlet_access.outlet_id ?? "",
        ccp_name: "",
        item_name: "",
        reading_value: 0,
        unit: "°C",
        corrective_action: "",
        verification_notes: "",
        source: "manual",
        recorded_at: localDateTimeValue(),
      });
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Log gagal disimpan."),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteHaccpEntry,
    onSuccess: async () => {
      toast.success("Log HACCP dihapus.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal hapus log."),
  });

  function handleSubmit() {
    if (!form.outlet_id) {
      toast.error("Pilih outlet terlebih dahulu.");
      return;
    }
    if (!form.ccp_name) {
      toast.error("Pilih titik kendali (CCP).");
      return;
    }
    if (!form.item_name?.trim()) {
      toast.error("Isi nama item.");
      return;
    }
    const payload: HaccpLogPayload = {
      ...form,
      item_name: form.item_name.trim(),
      corrective_action: form.corrective_action?.trim() || null,
      verification_notes: form.verification_notes?.trim() || null,
      recorded_at: new Date(form.recorded_at ?? localDateTimeValue()).toISOString(),
    };
    createMutation.mutate(payload);
  }

  const cards = [
    {
      label: "Total checks",
      value: summary?.total ?? 0,
      tone: "text-slate-700",
      icon: Thermometer,
    },
    { label: "Passed", value: summary?.passed ?? 0, tone: "text-emerald-700", icon: CheckCircle2 },
    { label: "Failed", value: summary?.failed ?? 0, tone: "text-red-700", icon: CircleAlert },
    {
      label: "Critical failures",
      value: summary?.critical_failures ?? 0,
      tone: "text-amber-700",
      icon: CircleAlert,
    },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Connected Store</p>
          <h1 className="text-2xl font-semibold text-slate-950">HACCP Log</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Catat pemeriksaan titik kendali kritis (CCP): suhu receiv, cold storage, cooking,
            reheating, dan hot holding. Nilai yang melanggar rentang otomatis ditandai gagal.
          </p>
        </div>
        {canExecute ? (
          <button
            type="button"
            onClick={() => setShowCreate((open) => !open)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            {showCreate ? <X className="size-4" /> : <Plus className="size-4" />}
            {showCreate ? "Tutup" : "Tambah log"}
          </button>
        ) : null}
      </header>

      {!isOutletWorkspace ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, value, tone, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase ${tone}`}>
                <Icon className="size-4" />
                {label}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {!isOutletWorkspace ? (
        <section className="flex flex-col gap-3 border-y border-slate-200 py-4 sm:flex-row">
          <select
            value={outletFilter}
            onChange={(event) => setOutletFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label="Filter outlet"
          >
            <option value="">All outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
          <select
            value={ccpFilter}
            onChange={(event) => setCcpFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label="Filter CCP"
          >
            <option value="">All CCPs</option>
            {ccps.map((ccp) => (
              <option key={ccp} value={ccp}>
                {ccp.replace("_", " ")}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {showCreate ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Log baru</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {!isOutletWorkspace ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Outlet</span>
                <select
                  value={form.outlet_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, outlet_id: event.target.value }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Pilih outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">CCP</span>
              <select
                value={form.ccp_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ccp_name: event.target.value }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Pilih CCP</option>
                {ccps.map((ccp) => (
                  <option key={ccp} value={ccp}>
                    {ccp.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nama item</span>
              <input
                value={form.item_name ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, item_name: event.target.value }))
                }
                placeholder="Beef patties"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Pembacaan</span>
                <input
                  type="number"
                  step="any"
                  value={form.reading_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reading_value: Number(event.target.value || 0),
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Satuan</span>
                <input
                  value={form.unit ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit: event.target.value }))
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Waktu pemeriksaan</span>
              <input
                type="datetime-local"
                value={form.recorded_at ?? localDateTimeValue()}
                onChange={(event) =>
                  setForm((current) => ({ ...current, recorded_at: event.target.value }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tindakan korektif</span>
              <input
                value={form.corrective_action ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, corrective_action: event.target.value }))
                }
                placeholder="Re-cook / buang batch"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Catatan verifikasi</span>
              <textarea
                value={form.verification_notes ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, verification_notes: event.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan log"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Belum ada log HACCP. Tambahkan pemeriksaan CCP pertama untuk mulai melacak kepatuhan.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {entry.ccp_name.replace("_", " ")}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        entry.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.passed ? "Passed" : "Failed"}
                    </span>
                    <span className="text-xs text-slate-400">{entry.source}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.item_name ?? "—"}
                    {entry.target_min != null || entry.target_max != null ? (
                      <span className="ml-1 text-slate-400">
                        (range {entry.target_min != null ? `${entry.target_min}${entry.unit}` : "—"}
                        –{entry.target_max != null ? `${entry.target_max}${entry.unit}` : "∞"})
                      </span>
                    ) : null}
                  </p>
                </div>
                {canExecute ? (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(entry.id)}
                    title="Hapus"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-2xl font-bold ${
                    entry.passed ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {entry.reading_value}
                  {entry.unit}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.recorded_at).toLocaleString([], {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {entry.corrective_action ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Korektif:</span> {entry.corrective_action}
                </p>
              ) : null}
              {entry.verification_notes ? (
                <p className="mt-1 text-xs text-slate-500">
                  Verifikasi: {entry.verification_notes}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  );
}

export default function HaccpPage() {
  return <HaccpPageContent />;
}
