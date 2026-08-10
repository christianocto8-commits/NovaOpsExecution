"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, ShieldAlert, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getBenchmarks } from "@/services/reports.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { LeaderboardPanel } from "@/features/gamification/components/leaderboard-panel";

export default function BenchmarksPage() {
  const benchmarkQuery = useQuery({
    queryKey: ["reports", "benchmarks"],
    queryFn: getBenchmarks,
    retry: false,
  });
  const data = benchmarkQuery.data;
  const outlets = data?.outlets ?? [];
  const summaryCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: "Average compliance", value: `${data?.average_compliance ?? 0}%`, icon: TrendingUp },
    { label: "Best outlet", value: data?.best_outlet ?? "-", icon: Award },
    { label: "At risk outlets", value: data?.at_risk_outlets ?? 0, icon: ShieldAlert },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">Enterprise Analytics</p>
        <h1 className="text-2xl font-semibold text-slate-950">Benchmarking & Leaderboard</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Ranking outlet, kepatuhan operasional, streak berturut-turut, dan akumulasi poin performa.
        </p>
      </div>

      <LeaderboardPanel />

      <section className="grid gap-3 md:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Icon className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Outlet ranking</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Outlet</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Compliance</th>
                <th className="px-3 py-2">Delta</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Overdue</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-slate-500">
                    Loading benchmarks...
                  </td>
                </tr>
              ) : outlets.length ? (
                outlets.map((outlet) => (
                  <tr key={outlet.outlet_id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-950">#{outlet.rank}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-950">{outlet.outlet_name}</p>
                      <p className="text-xs text-slate-500">{outlet.district ?? "-"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{outlet.region ?? "-"}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {outlet.compliance_rate}%
                    </td>
                    <td
                      className={`px-3 py-3 font-semibold ${outlet.score_delta_from_average < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {outlet.score_delta_from_average > 0 ? "+" : ""}
                      {outlet.score_delta_from_average}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {outlet.completed_tasks}/{outlet.total_tasks}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{outlet.overdue_tasks}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                          outlet.status === "at_risk"
                            ? "bg-red-100 text-red-700"
                            : outlet.status === "watch"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {outlet.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-slate-500">
                    Belum ada outlet untuk benchmark.
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
