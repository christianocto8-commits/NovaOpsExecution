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
];

const emptyForm: OpsSuiteItemPayload = {
  module: "inventory",
  title: "",
  outlet_id: null,
  status: "open",
  quantity: null,
  unit: null,
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
      setError("Title wajib diisi.");
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
        <p className="text-sm font-medium text-emerald-700">Crunchtime Suite</p>
        <h1 className="text-2xl font-semibold text-slate-950">Ops Suite</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Inventory, labor, food labeling, and procurement controls for enterprise operations.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Inventory", summary?.inventory_items ?? 0],
          ["Labor", summary?.labor_items ?? 0],
          ["Food Labels", summary?.food_label_items ?? 0],
          ["Procurement", summary?.procurement_items ?? 0],
          ["Open", summary?.open_items ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Create ops item</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.module} onChange={(event) => setForm((current) => ({ ...current, module: event.target.value as OpsSuiteModule }))}>
            {modules.map((module) => <option key={module.id} value={module.id}>{module.label}</option>)}
          </select>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-2" placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Outlet ID" value={form.outlet_id ?? ""} onChange={(event) => setForm((current) => ({ ...current, outlet_id: event.target.value || null }))} />
          <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Qty" value={form.quantity ?? ""} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value ? Number(event.target.value) : null }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Unit" value={form.unit ?? ""} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value || null }))} />
          <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-2" value={form.due_at ?? ""} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value || null }))} />
          <button type="button" onClick={() => void saveItem()} disabled={isSaving} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">
            {isSaving ? "Saving..." : "Save item"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Open controls</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.module}</td>
                  <td className="px-3 py-3 text-slate-700">{item.title}</td>
                  <td className="px-3 py-3 text-slate-600">{item.quantity ?? "-"} {item.unit ?? ""}</td>
                  <td className="px-3 py-3 text-slate-600">{item.due_at ? new Date(item.due_at).toLocaleString() : "-"}</td>
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
