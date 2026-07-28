"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CircleDollarSign, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ensureFinanceShiftTemplate,
  getFinanceSummary,
  listFinanceDeposits,
  reviewFinanceDeposit,
} from "@/services/finance-handoff.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { useToast } from "@/shared/toast";

export default function FinanceHandoffPage() {
  const toast = useToast();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const summaryQuery = useQuery({ queryKey: ["finance-summary"], queryFn: getFinanceSummary, retry: false });
  const depositsQuery = useQuery({ queryKey: ["finance-deposits"], queryFn: listFinanceDeposits, retry: false });
  const deposits = depositsQuery.data ?? [];
  const summary = summaryQuery.data;
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Pending", value: summary?.pending_review ?? 0, icon: Banknote },
    { label: "Approved", value: summary?.approved ?? 0, icon: CheckCircle2 },
    { label: "Variance", value: summary?.total_variance_amount ?? 0, icon: CircleDollarSign },
    { label: "Discrepancy", value: summary?.discrepancy_count ?? 0, icon: ShieldAlert },
  ];

  async function refresh() {
    await Promise.all([summaryQuery.refetch(), depositsQuery.refetch()]);
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

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Finance Handoff</p>
          <h1 className="text-2xl font-semibold text-slate-950">Shift Deposit & Finance Review</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Review setoran shift dari MyForm, cek variance, dan tindak lanjuti koreksi.
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
        <h2 className="text-lg font-semibold text-slate-950">Review queue</h2>
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
