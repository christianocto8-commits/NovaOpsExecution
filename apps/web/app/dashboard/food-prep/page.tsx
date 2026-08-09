"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Clock, Plus, Printer, Trash2, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { getIdentityOutlets, type IdentityOutlet } from "@/services/identity.service";
import {
  createFoodLabel,
  deleteFoodLabel,
  discardFoodLabel,
  getFoodPrepSummary,
  listFoodPrepLabels,
  type FoodPrepLabel,
  type FoodPrepLabelPayload,
} from "@/services/food-prep.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { useToast } from "@/shared/toast";
import { LabelPrintModal } from "@/features/printing/components/label-print-modal";

const CATEGORIES = ["raw", "prepared", "dairy", "bakery", "beverage", "cold_chain", "other"];

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "expiring_soon":
      return "bg-amber-100 text-amber-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "discarded":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function FoodPrepPageContent() {
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
  const [statusFilter, setStatusFilter] = useState("");
  const [outletFilter, setOutletFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [printLabel, setPrintLabel] = useState<FoodPrepLabel | null>(null);
  const [form, setForm] = useState<FoodPrepLabelPayload>({
    outlet_id: auth.user?.outlet_access.outlet_id ?? "",
    item_name: "",
    category: "prepared",
    batch_code: "",
    quantity_text: "",
    unit: "",
    prepared_notes: "",
    prepared_at: localDateTimeValue(),
    discard_at: "",
    shelf_hours: null,
  });

  const labelsQuery = useQuery({
    queryKey: ["food-prep-labels", statusFilter, outletFilter],
    queryFn: () =>
      listFoodPrepLabels({
        status: statusFilter || undefined,
        outlet_id: outletFilter || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["food-prep-summary"],
    queryFn: getFoodPrepSummary,
    enabled: !isOutletWorkspace,
  });
  const outletsQuery = useQuery({
    queryKey: ["identity-outlets", "food-prep"],
    queryFn: getIdentityOutlets,
    enabled: auth.can("outlet.read"),
  });

  const outlets = useMemo<IdentityOutlet[]>(() => {
    if (outletsQuery.data?.length) return outletsQuery.data;
    return auth.user?.outlet_access.outlets ?? [];
  }, [auth.user?.outlet_access.outlets, outletsQuery.data]);

  const labels = labelsQuery.data ?? [];
  const summary = summaryQuery.data;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["food-prep-labels"] });
    await queryClient.invalidateQueries({ queryKey: ["food-prep-summary"] });
  };

  const createMutation = useMutation({
    mutationFn: createFoodLabel,
    onSuccess: async () => {
      toast.success("Label food prep dibuat.");
      setShowCreate(false);
      setForm({
        outlet_id: auth.user?.outlet_access.outlet_id ?? "",
        item_name: "",
        category: "prepared",
        batch_code: "",
        quantity_text: "",
        unit: "",
        prepared_notes: "",
        prepared_at: localDateTimeValue(),
        discard_at: "",
        shelf_hours: null,
      });
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Label gagal dibuat."),
  });
  const discardMutation = useMutation({
    mutationFn: discardFoodLabel,
    onSuccess: async () => {
      toast.success("Label ditandai dibuang.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal update label."),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFoodLabel,
    onSuccess: async () => {
      toast.success("Label dihapus.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal hapus label."),
  });

  function handleSubmit() {
    if (!form.item_name.trim() || !form.discard_at) {
      toast.error("Isi nama item dan waktu buang.");
      return;
    }
    if (!form.outlet_id) {
      toast.error("Pilih outlet terlebih dahulu.");
      return;
    }
    const payload: FoodPrepLabelPayload = {
      ...form,
      discard_at: new Date(form.discard_at).toISOString(),
      prepared_at: new Date(form.prepared_at).toISOString(),
      batch_code: form.batch_code || null,
      quantity_text: form.quantity_text || null,
      unit: form.unit || null,
      prepared_notes: form.prepared_notes || null,
      shelf_hours: form.shelf_hours ?? null,
    };
    createMutation.mutate(payload);
  }

  const cards = [
    { label: "Active", value: summary?.active ?? 0, tone: "text-emerald-700" },
    { label: "Expiring soon", value: summary?.expiring_soon ?? 0, tone: "text-amber-700" },
    { label: "Expired", value: summary?.expired ?? 0, tone: "text-red-700" },
    { label: "Discarded", value: summary?.discarded ?? 0, tone: "text-slate-500" },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Connected Store</p>
          <h1 className="text-2xl font-semibold text-slate-950">Food Prep Labeling</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Buat label persiapan makanan (item, waktu siap, waktu buang) untuk kepatuhan cold chain
            dan food safety di outlet.
          </p>
        </div>
        {canExecute ? (
          <button
            type="button"
            onClick={() => setShowCreate((open) => !open)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            {showCreate ? <X className="size-4" /> : <Plus className="size-4" />}
            {showCreate ? "Tutup" : "Buat label"}
          </button>
        ) : null}
      </header>

      {!isOutletWorkspace ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, value, tone }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase ${tone}`}>
                {label === "Active" ? (
                  <CheckCircle2 className="size-4" />
                ) : label === "Expired" ? (
                  <CircleAlert className="size-4" />
                ) : (
                  <Clock className="size-4" />
                )}
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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label="Filter status"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring soon</option>
            <option value="expired">Expired</option>
            <option value="discarded">Discarded</option>
          </select>
        </section>
      ) : null}

      {showCreate ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Label baru</h2>
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
              <span className="text-sm font-medium text-slate-700">Nama item</span>
              <input
                value={form.item_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, item_name: event.target.value }))
                }
                placeholder="Chicken Curry Batch"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Kategori</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Batch code</span>
              <input
                value={form.batch_code ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, batch_code: event.target.value }))
                }
                placeholder="B-001"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Jumlah</span>
                <input
                  value={form.quantity_text ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity_text: event.target.value }))
                  }
                  placeholder="5"
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
                  placeholder="kg"
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Waktu siap</span>
              <input
                type="datetime-local"
                value={form.prepared_at}
                onChange={(event) =>
                  setForm((current) => ({ ...current, prepared_at: event.target.value }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Waktu buang (discard)</span>
              <input
                type="datetime-local"
                value={form.discard_at}
                onChange={(event) =>
                  setForm((current) => ({ ...current, discard_at: event.target.value }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Shelf life (jam)</span>
              <input
                type="number"
                min={0}
                value={form.shelf_hours ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shelf_hours: Number(event.target.value || 0),
                  }))
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Catatan</span>
              <textarea
                value={form.prepared_notes ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, prepared_notes: event.target.value }))
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
              {createMutation.isPending ? "Menyimpan..." : "Simpan label"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        {labels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Belum ada label food prep. Buat label pertama untuk mulai melacak waktu buang.
          </div>
        ) : (
          labels.map((label) => (
            <div key={label.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {label.item_name}
                    </h3>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(label.status)}`}
                    >
                      {label.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {label.category.replace("_", " ")}
                    {label.batch_code ? ` · ${label.batch_code}` : ""}
                    {label.quantity_text
                      ? ` · ${label.quantity_text}${label.unit ? ` ${label.unit}` : ""}`
                      : ""}
                  </p>
                </div>
                {canExecute ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {label.status !== "discarded" && label.status !== "expired" ? (
                      <button
                        type="button"
                        onClick={() => setPrintLabel(label)}
                        title="Cetak label"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                      >
                        <Printer className="size-4" />
                      </button>
                    ) : null}
                    {label.status !== "discarded" && label.status !== "expired" ? (
                      <button
                        type="button"
                        onClick={() => discardMutation.mutate(label.id)}
                        title="Tandai dibuang"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      >
                        <CheckCircle2 className="size-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(label.id)}
                      title="Hapus"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Disiapkan</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {new Date(label.prepared_at).toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Buang sebelum</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {new Date(label.discard_at).toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Shelf life</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {label.shelf_hours != null ? `${label.shelf_hours} jam` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Dibuat</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {new Date(label.created_at).toLocaleDateString([], {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </section>

      {printLabel ? (
        <LabelPrintModal
          label={{
            itemName: printLabel.item_name,
            category: printLabel.category,
            batchCode: printLabel.batch_code,
            quantityText: printLabel.quantity_text,
            unit: printLabel.unit,
            preparedAt: printLabel.prepared_at,
            discardAt: printLabel.discard_at,
            shelfHours: printLabel.shelf_hours,
          }}
          onClose={() => setPrintLabel(null)}
        />
      ) : null}
    </main>
  );
}

export default function FoodPrepPage() {
  return <FoodPrepPageContent />;
}
