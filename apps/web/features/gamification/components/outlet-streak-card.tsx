"use client";

import { useEffect, useState } from "react";
import { Flame, Trophy, Award, ShieldCheck, Zap } from "lucide-react";

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

export function OutletStreakCard() {
  const [stats, setStats] = useState<OutletGamificationStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/v1/gamification/outlet-stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("novaops_token") ?? ""}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setStats(json);
        }
      } catch (err) {
        console.error("Failed to load outlet stats", err);
      }
    }

    fetchStats();
  }, []);

  if (!stats) return null;

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

        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: stats.tier_color }}
        >
          {stats.tier}
        </span>
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
            Pencapaian Badges (Terkunci & Terbuka)
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
