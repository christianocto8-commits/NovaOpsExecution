"use client";

import { useEffect, useState } from "react";
import { Trophy, Flame, Zap, Shield, Camera, Award } from "lucide-react";

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

export function LeaderboardPanel() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/v1/gamification/leaderboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("novaops_token") ?? ""}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <p className="text-sm font-medium text-slate-500">Memuat Leaderboard Outlet...</p>
      </div>
    );
  }

  if (!data || !data.leaderboard.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Belum ada data peringkat outlet.</p>
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
          <h2 className="mt-1 text-2xl font-black">Outlet Leaderboard & Gamifikasi</h2>
          <p className="mt-1 text-xs text-amber-100 sm:text-sm">
            Peringkat kepatuhan operasional, streak berturut-turut, dan akumulasi poin performa 30
            hari.
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-md">
          <p className="text-xs font-medium text-amber-100">Total Outlet Aktif</p>
          <p className="text-2xl font-black text-white">{data.total_outlets} Outlet</p>
        </div>
      </div>

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
