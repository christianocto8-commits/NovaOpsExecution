"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, Flame, Zap, Shield, Camera, Award, RefreshCw } from "lucide-react";

type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

type LeaderboardEntry = {
  rank: number;
  outlet_id: number;
  outlet_name: string;
  outlet_code: string;
  points: number;
  tier: string;
  tier_color: string;
  completion_rate: number;
  streak_days: number;
  badges_count: number;
  badges: BadgeItem[];
};

type LeaderboardResponse = {
  period: string;
  total_outlets: number;
  leaderboard: LeaderboardEntry[];
};

const REFRESH_INTERVAL_MS = 60_000; // Auto-refresh every 60 seconds

export function LeaderboardPanel() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("novaops_token") ?? "";
      const res = await fetch("/api/v1/gamification/leaderboard", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          res.status === 401
            ? "Sesi login habis. Silakan login kembali."
            : `Gagal memuat leaderboard (${res.status}). ${errorText}`
        );
      }

      const json: LeaderboardResponse = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal terhubung ke server.";
      setError(message);
      console.error("LeaderboardPanel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh polling
  useEffect(() => {
    fetchLeaderboard(true);

    const interval = setInterval(() => {
      fetchLeaderboard(false);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  if (loading && !data) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Memuat Leaderboard dari server...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => fetchLeaderboard(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data || !data.leaderboard.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          Belum ada data outlet aktif di database. Pastikan outlet sudah terdaftar di sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-amber-200" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
              NovaOps Performance Championship
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black">Outlet Leaderboard &amp; Gamifikasi</h2>
          <p className="mt-1 text-xs text-amber-100 sm:text-sm">
            Peringkat kepatuhan operasional, streak berturut-turut, dan akumulasi poin performa 30
            hari. Data real-time dari server.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-medium text-amber-100">Total Outlet Aktif</p>
            <p className="text-2xl font-black text-white">{data.total_outlets} Outlet</p>
          </div>
          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            className="rounded-xl bg-white/10 p-3 backdrop-blur-md hover:bg-white/20 transition-colors"
            title="Refresh data dari server"
          >
            <RefreshCw className={`size-5 text-white ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Live update indicator */}
      {lastUpdated && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
          <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Live dari VPS · Terakhir diperbarui{" "}
            {lastUpdated.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {data.leaderboard.slice(0, 3).map((item, idx) => {
          const isFirst = idx === 0;
          const isSecond = idx === 1;

          return (
            <div
              key={item.outlet_id}
              className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                isFirst
                  ? "border-amber-300 bg-amber-50/60"
                  : isSecond
                    ? "border-slate-300 bg-slate-50/60"
                    : "border-orange-200 bg-orange-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex size-9 items-center justify-center rounded-xl font-black text-sm text-white ${
                    isFirst ? "bg-amber-500" : isSecond ? "bg-slate-400" : "bg-orange-600"
                  }`}
                >
                  #{item.rank}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: item.tier_color }}
                >
                  {item.tier}
                </span>
              </div>

              <h3 className="mt-3 truncate text-lg font-bold text-slate-900">{item.outlet_name}</h3>
              <p className="text-xs text-slate-500">Code: {item.outlet_code}</p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Poin</p>
                  <p className="text-xl font-black text-slate-900">{item.points} pts</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Completion</p>
                  <p className="text-base font-bold text-emerald-700">{item.completion_rate}%</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700">
                <Flame className="size-4 fill-amber-500 text-amber-500" />
                <span>{item.streak_days} Hari Streak Berturut-turut</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-bold text-slate-900">Klasemen Peringkat Kepatuhan Outlet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Peringkat</th>
                <th className="px-6 py-3">Nama Outlet</th>
                <th className="px-6 py-3">Tier</th>
                <th className="px-6 py-3 text-center">Streak</th>
                <th className="px-6 py-3 text-center">Completion Rate</th>
                <th className="px-6 py-3 text-center">Badges</th>
                <th className="px-6 py-3 text-right">Poin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.leaderboard.map((item) => (
                <tr key={item.outlet_id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-bold text-slate-900">#{item.rank}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{item.outlet_name}</span>
                    <span className="ml-2 text-xs text-slate-400">({item.outlet_code})</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: item.tier_color }}
                    >
                      {item.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-amber-600">
                    🔥 {item.streak_days}d
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-700">
                    {item.completion_rate}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      <Award className="size-3.5 text-amber-600" />
                      {item.badges_count} Badge
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    {item.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
