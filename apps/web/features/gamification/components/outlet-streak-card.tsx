"use client";

import { useEffect, useState, useCallback } from "react";
import { Flame, Trophy, Award, ShieldCheck, Zap, RefreshCw } from "lucide-react";

type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

type OutletGamificationStats = {
  outlet_id: number;
  outlet_name: string;
  rank: number;
  total_outlets: number;
  points: number;
  tier: string;
  tier_color: string;
  streak_days: number;
  completion_rate: number;
  badges: BadgeItem[];
};

const REFRESH_INTERVAL_MS = 60_000; // Auto-refresh every 60 seconds

export function OutletStreakCard() {
  const [stats, setStats] = useState<OutletGamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("novaops_token") ?? "";
      const res = await fetch("/api/v1/gamification/outlet-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Sesi login habis. Silakan login kembali."
            : `Gagal memuat data performa (${res.status}).`
        );
      }

      const json: OutletGamificationStats = await res.json();
      setStats(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal terhubung ke server.";
      setError(message);
      console.error("OutletStreakCard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh polling
  useEffect(() => {
    fetchStats(true);

    const interval = setInterval(() => {
      fetchStats(false);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex h-36 items-center justify-center rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 animate-spin text-white" />
          <p className="text-sm font-medium text-white/80">Memuat data performa outlet...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => fetchStats(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center">
        <p className="text-sm text-slate-500">
          Belum ada data performa outlet. Pastikan outlet sudah terdaftar di sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <Flame className="size-5 text-amber-100" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
            Performa Outlet
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: stats.tier_color }}
          >
            {stats.tier}
          </span>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20 transition-colors"
            title="Refresh data dari server"
          >
            <RefreshCw className={`size-3.5 text-white ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-black/15 p-3.5 backdrop-blur-md text-center">
        <div>
          <p className="text-[11px] font-semibold text-amber-100">Daily Streak</p>
          <p className="text-xl font-black text-amber-200">🔥 {stats.streak_days} Hari</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-amber-100">Peringkat</p>
          <p className="text-xl font-black text-white">
            #{stats.rank}{" "}
            <span className="text-xs font-normal text-amber-200">/ {stats.total_outlets}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-amber-100">Total Poin</p>
          <p className="text-xl font-black text-white">{stats.points} pts</p>
        </div>
      </div>

      {stats.badges && stats.badges.length > 0 ? (
        <div className="mt-4 border-t border-white/20 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-100">
            Pencapaian Badges (Terkunci &amp; Terbuka)
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.badges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  b.unlocked
                    ? "bg-white/20 text-white backdrop-blur-md border border-white/30"
                    : "bg-black/20 text-amber-200/50 line-through"
                }`}
              >
                <Award className="size-3.5" />
                {b.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
