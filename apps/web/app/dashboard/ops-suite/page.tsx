"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  createOpsSuiteItem,
  getOpsSuiteSummary,
  listOpsSuiteItems,
  type OpsSuiteItemPayload,
  type OpsSuiteModule,
} from "@/services/ops-suite.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

const modules: Array<{ id: OpsSuiteModule; label: string }> = [
  { id: "inventory", label: "Inventory" },
  { id: "labor", label: "Labor" },
  { id: "food_label", label: "Food Labels" },
  { id: "procurement", label: "Procurement" },
  { id: "onboarding", label: "Onboarding" },
  { id: "customer_success", label: "Customer Success" },
  { id: "benchmark", label: "Benchmark" },
  { id: "integration", label: "Integration" },
];

const emptyForm: OpsSuiteItemPayload = {
  module: "inventory",
  title: "",
  outlet_id: null,
  status: "open",
  quantity: null,
  unit: null,
  cost_per_unit: null,
  actual_cost: null,
  supplier: null,
  forecast_quantity: null,
  labor_hours: null,
  attendance_count: null,
  compliance_rule: null,
  due_at: null,
  metadata_json: null,
};

export default function OpsSuitePage() {
  const [form, setForm] = useState<OpsSuiteItemPayload>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["ops-suite-summary"],
    queryFn: getOpsSuiteSummary,
    retry: false,
  });
  const itemsQuery = useQuery({
    queryKey: ["ops-suite-items"],
    queryFn: () => listOpsSuiteItems(),
    retry: false,
  });

  const summary = summaryQuery.data;
  const items = itemsQuery.data ?? [];

  async function saveItem() {
    if (!form.title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await createOpsSuiteItem({
        ...form,
        title: form.title.trim(),
        outlet_id: form.outlet_id?.trim() || null,
        unit: form.unit?.trim() || null,
        supplier: form.supplier?.trim() || null,
        compliance_rule: form.compliance_rule?.trim() || null,
        due_at: form.due_at || null,
      });
      setForm(emptyForm);
      await Promise.all([itemsQuery.refetch(), summaryQuery.refetch()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">Operasional Terpadu</p>
        <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Ops Suite</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Kelola inventori, tenaga kerja, label makanan, pengadaan, onboarding, dan integrasi.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Inventory", summary?.inventory_items ?? 0],
          ["Labor", summary?.labor_items ?? 0],
          ["Food Labels", summary?.food_label_items ?? 0],
          ["Procurement", summary?.procurement_items ?? 0],
          ["Open", summary?.open_items ?? 0],
          ["Inventory Cost", `$${(summary?.inventory_cost ?? 0).toLocaleString()}`],
          ["Forecast Var.", summary?.forecast_variance ?? 0],
          ["Labor Hours", summary?.labor_hours ?? 0],
          ["Open PO", summary?.open_procurement_items ?? 0],
          ["Integrations", summary?.integration_items ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-950">Tambah Item Operasional</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.module}
            onChange={(event) =>
              setForm((current) => ({ ...current, module: event.target.value as OpsSuiteModule }))
            }
          >
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.label}
              </option>
            ))}
          </select>
          <input
            className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-2"
            placeholder="Judul"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Outlet ID"
            value={form.outlet_id ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, outlet_id: event.target.value || null }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Qty"
            value={form.quantity ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                quantity: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Unit"
            value={form.unit ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, unit: event.target.value || null }))
            }
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Supplier / partner"
            value={form.supplier ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, supplier: event.target.value || null }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Cost per unit"
            value={form.cost_per_unit ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                cost_per_unit: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Actual cost"
            value={form.actual_cost ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                actual_cost: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Forecast qty"
            value={form.forecast_quantity ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                forecast_quantity: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Labor hours"
            value={form.labor_hours ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                labor_hours: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            type="number"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Attendance"
            value={form.attendance_count ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                attendance_count: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Compliance rule"
            value={form.compliance_rule ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, compliance_rule: event.target.value || null }))
            }
          />
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-2"
            value={form.due_at ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, due_at: event.target.value || null }))
            }
          />
          <button
            type="button"
            onClick={() => void saveItem()}
            disabled={isSaving}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isSaving ? "Menyimpan..." : "Simpan Item"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-950">Item Operasional</h2>
        <div className="mt-4 space-y-3 lg:hidden">
          {items.length ? (
            items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs uppercase text-slate-500">{item.module}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Jumlah</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {item.quantity ?? "-"} {item.unit ?? ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Biaya</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {item.actual_cost ??
                        (item.quantity && item.cost_per_unit
                          ? item.quantity * item.cost_per_unit
                          : "-")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Pemasok</dt>
                    <dd className="mt-1 text-slate-700">{item.supplier ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Batas waktu</dt>
                    <dd className="mt-1 text-slate-700">
                      {item.due_at ? new Date(item.due_at).toLocaleString() : "-"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <p className="py-6 text-sm text-slate-500">Belum ada item operasional.</p>
          )}
        </div>
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Forecast</th>
                <th className="px-3 py-2">Labor</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.module}</td>
                  <td className="px-3 py-3 text-slate-700">{item.title}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.quantity ?? "-"} {item.unit ?? ""}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.actual_cost ??
                      (item.quantity && item.cost_per_unit
                        ? item.quantity * item.cost_per_unit
                        : "-")}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{item.supplier ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{item.forecast_quantity ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{item.labor_hours ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.due_at ? new Date(item.due_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
