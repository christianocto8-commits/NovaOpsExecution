"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Inbox,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { BarChartCard, LineChartCard } from "@/shared/analytics/charts";
import { useAuth } from "@/hooks/useAuth";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { RealtimeClock } from "@/shared/realtime";
import { useToast } from "@/shared/toast";
import {
  downloadFinanceExport,
  getFinanceDashboard,
  type FinanceShiftDeposit,
} from "@/services/finance-handoff.service";

function formatMoney(value: number) {
  return value.toLocaleString("id-ID");
}

function statusLabel(status: string) {
  switch (status) {
    case "pending_review":
      return "Menunggu review";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    case "correction_requested":
      return "Perlu koreksi";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "pending_review":
      return "bg-amber-50 text-amber-800";
    case "approved":
      return "bg-emerald-50 text-emerald-800";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "correction_requested":
      return "bg-orange-50 text-orange-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Banknote;
  tone?: "slate" | "emerald" | "amber" | "red" | "blue";
}) {
  const toneClass = {
    slate: "text-slate-950",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    blue: "text-blue-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${toneClass}`}>{value}</p>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function IncomingReportRow({
  deposit,
  threshold,
}: {
  deposit: FinanceShiftDeposit;
  threshold: number;
}) {
  const isDiscrepancy = Math.abs(deposit.variance_amount) >= threshold;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">
          {deposit.outlet_name ?? deposit.outlet_id ?? "Outlet"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {deposit.business_date} · {deposit.shift_name} · {deposit.department}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold text-slate-950">
            Rp {formatMoney(deposit.deposit_amount)}
          </p>
          <p className={`break-words text-xs font-semibold ${isDiscrepancy ? "text-red-600" : "text-emerald-700"}`}>
            Selisih {formatMoney(deposit.variance_amount)}
          </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClass(deposit.status)}`}>
          {statusLabel(deposit.status)}
        </span>
      </div>
    </div>
  );
}

export function FinanceDashboard() {
  const toast = useToast();
  const { can } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["finance-dashboard", 7],
    queryFn: () => getFinanceDashboard(7),
    retry: false,
  });

  const data = dashboardQuery.data;
  const summary = data?.summary;
  const threshold = summary?.discrepancy_threshold ?? 50000;

  const trendData = useMemo(
    () =>
      (data?.daily_trend ?? []).map((point) => ({
        day: point.date,
        reports: point.reports_count,
        pending: point.pending_review,
      })),
    [data?.daily_trend]
  );

  const outletData = useMemo(
    () =>
      (data?.by_outlet ?? []).slice(0, 8).map((row) => ({
        outlet: row.outlet_name.length > 14 ? `${row.outlet_name.slice(0, 14)}…` : row.outlet_name,
        pending: row.pending_review,
        deposit: row.total_deposit_amount,
      })),
    [data?.by_outlet]
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadFinanceExport("csv");
      toast.success("Export laporan finance berhasil diunduh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh export finance.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Finance Dashboard</p>
          <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">
            Report masuk ke Finance
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Pantau setoran shift yang dikirim outlet, antrean review, variance, dan
            outlet yang butuh perhatian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RealtimeClock />
          <button
            type="button"
            onClick={() => void dashboardQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {can("finance.export") ? (
            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleExport()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#274733] px-4 py-3 text-sm font-bold text-white hover:bg-[#1F3A2A] disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Mengunduh..." : "Export CSV"}
            </button>
          ) : null}
          <Link
            href="/dashboard/finance-handoff"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Buka antrean review
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {dashboardQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat Finance Dashboard. Pastikan akun memiliki permission finance.read.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Report masuk hari ini"
          value={String(summary?.incoming_today ?? 0)}
          description="Setoran shift dengan tanggal bisnis hari ini"
          icon={Inbox}
          tone="blue"
        />
        <MetricCard
          label="Menunggu review"
          value={String(summary?.pending_review ?? 0)}
          description="Report yang perlu diperiksa Finance"
          icon={Banknote}
          tone="amber"
        />
        <MetricCard
          label="Total setoran"
          value={`Rp ${formatMoney(summary?.total_deposit_amount ?? 0)}`}
          description={`${summary?.total_reports ?? 0} report masuk ke finance`}
          icon={CircleDollarSign}
          tone="emerald"
        />
        <MetricCard
          label="Discrepancy"
          value={String(summary?.discrepancy_count ?? 0)}
          description={`Selisih ≥ Rp ${formatMoney(threshold)}`}
          icon={ShieldAlert}
          tone="red"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Cash sales</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            Rp {formatMoney(summary?.total_cash_sales ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">QRIS sales</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            Rp {formatMoney(summary?.total_qris_sales ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">EDC sales</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            Rp {formatMoney(summary?.total_edc_sales ?? 0)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Tren report 7 hari"
          description="Jumlah report setoran yang masuk per hari"
          data={trendData}
          xKey="day"
          series={[
            { dataKey: "reports", name: "Report masuk" },
            { dataKey: "pending", name: "Pending review" },
          ]}
        />
        <BarChartCard
          title="Setoran per outlet"
          description="Total deposit dari report yang masuk"
          data={outletData}
          xKey="outlet"
          series={[
            { dataKey: "deposit", name: "Deposit" },
            { dataKey: "pending", name: "Pending" },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Report baru masuk</h2>
              <p className="mt-1 text-sm text-slate-500">
                Setoran shift terbaru yang dikirim outlet ke Finance.
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.recent_incoming ?? []).length ? (
              data?.recent_incoming.map((deposit) => (
                <IncomingReportRow key={deposit.id} deposit={deposit} threshold={threshold} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Belum ada report finance yang masuk.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Perlu perhatian</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pending, koreksi, atau discrepancy di atas ambang.
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.attention_queue ?? []).length ? (
              data?.attention_queue.map((deposit) => (
                <div key={deposit.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {deposit.outlet_name ?? deposit.outlet_id ?? "Outlet"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {deposit.business_date} · {deposit.shift_name}
                      </p>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(deposit.status)}`}>
                      {statusLabel(deposit.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">
                    Deposit Rp {formatMoney(deposit.deposit_amount)}
                  </p>
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      Math.abs(deposit.variance_amount) >= threshold ? "text-red-600" : "text-slate-600"
                    }`}
                  >
                    Selisih {formatMoney(deposit.variance_amount)}
                    {deposit.corrective_task_id ? ` · CAPA #${deposit.corrective_task_id}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Tidak ada report yang perlu perhatian saat ini.
              </p>
            )}
          </div>

          <Link
            href="/dashboard/finance-handoff"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Review semua report
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Ringkasan per outlet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Agregat report finance yang masuk dari masing-masing outlet.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Outlet</th>
                <th className="px-3 py-2">Report</th>
                <th className="px-3 py-2">Pending</th>
                <th className="px-3 py-2">Approved</th>
                <th className="px-3 py-2">Total Setoran</th>
                <th className="px-3 py-2">Variance</th>
                <th className="px-3 py-2">Discrepancy</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_outlet ?? []).length ? (
                data?.by_outlet.map((row) => (
                  <tr key={`${row.outlet_id ?? row.outlet_name}`} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-950">{row.outlet_name}</td>
                    <td className="px-3 py-3 text-slate-600">{row.total_reports}</td>
                    <td className="px-3 py-3 text-amber-700">{row.pending_review}</td>
                    <td className="px-3 py-3 text-emerald-700">{row.approved}</td>
                    <td className="px-3 py-3 text-slate-600">Rp {formatMoney(row.total_deposit_amount)}</td>
                    <td className="px-3 py-3 text-slate-600">Rp {formatMoney(row.total_variance_amount)}</td>
                    <td className="px-3 py-3 font-semibold text-red-600">{row.discrepancy_count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Belum ada data outlet untuk finance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
