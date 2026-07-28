"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CircleDollarSign, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  createFinanceDeposit,
  ensureFinanceShiftTemplate,
  getFinanceSummary,
  listFinanceDeposits,
  reviewFinanceDeposit,
  type FinanceShiftDepositPayload,
} from "@/services/finance-handoff.service";
import { outletService, type LegacyOutlet } from "@/services/outlet.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { useToast } from "@/shared/toast";

const today = new Date().toISOString().slice(0, 10);
const shiftOptions = ["morning", "evening", "midnight"];

const emptyForm: FinanceShiftDepositPayload = {
  outlet_id: null,
  outlet_name: null,
  business_date: today,
  shift_name: "midnight",
  department: "bar",
  cashier_name: null,
  cash_sales: 0,
  qris_sales: 0,
  edc_sales: 0,
  expected_cash: 0,
  actual_cash: 0,
  deposit_amount: 0,
  variance_reason: null,
  evidence_urls: [],
};

export default function FinanceHandoffPage() {
  const toast = useToast();
  const [form, setForm] = useState<FinanceShiftDepositPayload>(emptyForm);
  const [evidenceText, setEvidenceText] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const summaryQuery = useQuery({ queryKey: ["finance-summary"], queryFn: getFinanceSummary, retry: false });
  const depositsQuery = useQuery({ queryKey: ["finance-deposits"], queryFn: listFinanceDeposits, retry: false });
  const outletsQuery = useQuery({ queryKey: ["finance-outlets"], queryFn: outletService.listMine, retry: false });
  const deposits = depositsQuery.data ?? [];
  const outlets = outletsQuery.data ?? [];
  const summary = summaryQuery.data;
  const variance = form.actual_cash - form.expected_cash;
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Pending", value: summary?.pending_review ?? 0, icon: Banknote },
    { label: "Approved", value: summary?.approved ?? 0, icon: CheckCircle2 },
    { label: "Variance", value: summary?.total_variance_amount ?? 0, icon: CircleDollarSign },
    { label: "Discrepancy", value: summary?.discrepancy_count ?? 0, icon: ShieldAlert },
  ];

  async function refresh() {
    await Promise.all([summaryQuery.refetch(), depositsQuery.refetch()]);
  }

  async function submitDeposit() {
    if (!form.outlet_id) {
      toast.error("Pilih outlet terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      const evidence_urls = evidenceText.split("\n").map((line) => line.trim()).filter(Boolean);
      const selectedOutlet = outlets.find((outlet) => String(outlet.id) === form.outlet_id);
      await createFinanceDeposit({
        ...form,
        outlet_id: selectedOutlet ? String(selectedOutlet.id) : form.outlet_id?.trim() || null,
        outlet_name: selectedOutlet ? selectedOutlet.name : form.outlet_name?.trim() || null,
        department: form.department.trim() || "bar",
        shift_name: form.shift_name.trim() || "midnight",
        cashier_name: form.cashier_name?.trim() || null,
        variance_reason: form.variance_reason?.trim() || null,
        evidence_urls,
      });
      setForm(emptyForm);
      setEvidenceText("");
      await refresh();
      toast.success("Setoran shift terkirim ke Finance.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal submit setoran.");
    } finally {
      setIsSaving(false);
    }
  }

  async function review(id: string, status: string) {
    await reviewFinanceDeposit(id, status, reviewNotes[id] ?? null);
    await refresh();
    toast.success("Finance review tersimpan.");
  }

  async function ensureTemplate() {
    try {
      const template = await ensureFinanceShiftTemplate();
      toast.success(`Template "${template.title}" siap di MyForm.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat template Finance.");
    }
  }

  function selectOutlet(outletId: string) {
    const selectedOutlet = outlets.find((outlet) => String(outlet.id) === outletId);
    setForm((current) => ({
      ...current,
      outlet_id: outletId || null,
      outlet_name: selectedOutlet?.name ?? null,
    }));
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Finance Handoff</p>
          <h1 className="text-2xl font-semibold text-slate-950">Shift Deposit & Finance Review</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Bar/outlet closing shift, setoran kas, variance, evidence, dan approval Finance dalam satu alur.
          </p>
        </div>
        <button type="button" onClick={() => void ensureTemplate()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          Ensure MyForm Template
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Icon className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Submit closing shift</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.outlet_id ?? ""} onChange={(event) => selectOutlet(event.target.value)}>
            <option value="">Select outlet</option>
            {outlets.map((outlet: LegacyOutlet) => (
              <option key={outlet.id} value={String(outlet.id)}>
                {outlet.name}
              </option>
            ))}
          </select>
          <input className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" readOnly value={form.outlet_name ?? ""} placeholder="Outlet name auto-filled" />
          <input type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.business_date} onChange={(event) => setForm((current) => ({ ...current, business_date: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.shift_name} onChange={(event) => setForm((current) => ({ ...current, shift_name: event.target.value }))}>
            {shiftOptions.map((shift) => (
              <option key={shift} value={shift}>{shift}</option>
            ))}
          </select>
          <Input value={form.department} placeholder="Department" onChange={(value) => setForm((current) => ({ ...current, department: value }))} />
          <Input value={form.cashier_name ?? ""} placeholder="Cashier" onChange={(value) => setForm((current) => ({ ...current, cashier_name: value || null }))} />
          <NumberInput value={form.cash_sales} placeholder="Cash sales" onChange={(value) => setForm((current) => ({ ...current, cash_sales: value }))} />
          <NumberInput value={form.qris_sales} placeholder="QRIS sales" onChange={(value) => setForm((current) => ({ ...current, qris_sales: value }))} />
          <NumberInput value={form.edc_sales} placeholder="EDC sales" onChange={(value) => setForm((current) => ({ ...current, edc_sales: value }))} />
          <NumberInput value={form.expected_cash} placeholder="Expected cash" onChange={(value) => setForm((current) => ({ ...current, expected_cash: value }))} />
          <NumberInput value={form.actual_cash} placeholder="Actual cash" onChange={(value) => setForm((current) => ({ ...current, actual_cash: value }))} />
          <NumberInput value={form.deposit_amount} placeholder="Deposit amount" onChange={(value) => setForm((current) => ({ ...current, deposit_amount: value }))} />
          <Input value={form.variance_reason ?? ""} placeholder="Variance reason" onChange={(value) => setForm((current) => ({ ...current, variance_reason: value || null }))} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-3" rows={2} placeholder="Evidence URLs, one per line" value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${Math.abs(variance) >= (summary?.discrepancy_threshold ?? 50000) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            Variance {variance.toLocaleString()}
          </span>
          <button type="button" onClick={() => void submitDeposit()} disabled={isSaving} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">
            {isSaving ? "Submitting..." : "Submit to Finance"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Finance review queue</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Outlet</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Deposit</th>
                <th className="px-3 py-2">Variance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length ? deposits.map((deposit) => (
                <tr key={deposit.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3 text-slate-600">{deposit.business_date}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-950">{deposit.outlet_name ?? deposit.outlet_id ?? "-"}</p>
                    <p className="text-xs text-slate-500">{deposit.department}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{deposit.shift_name}</td>
                  <td className="px-3 py-3 text-slate-600">{deposit.deposit_amount.toLocaleString()}</td>
                  <td className={`px-3 py-3 font-semibold ${Math.abs(deposit.variance_amount) >= (summary?.discrepancy_threshold ?? 50000) ? "text-red-600" : "text-emerald-700"}`}>
                    {deposit.variance_amount.toLocaleString()}
                    {deposit.corrective_task_id ? <p className="text-xs text-red-500">CAPA #{deposit.corrective_task_id}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{deposit.status}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[260px] flex-col gap-2">
                      <input className="rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Finance note" value={reviewNotes[deposit.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [deposit.id]: event.target.value }))} />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void review(deposit.id, "approved")} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-bold text-white">Approve</button>
                        <button type="button" onClick={() => void review(deposit.id, "correction_requested")} className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white">Correction</button>
                        <button type="button" onClick={() => void review(deposit.id, "rejected")} className="rounded-lg bg-red-700 px-2 py-1 text-xs font-bold text-white">Reject</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-3 py-6 text-slate-500">Belum ada setoran shift.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Input({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function NumberInput({ value, placeholder, onChange }: { value: number; placeholder: string; onChange: (value: number) => void }) {
  return <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={placeholder} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}
