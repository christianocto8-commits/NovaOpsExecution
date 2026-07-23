"use client";

import { RefreshCw, Wifi } from "lucide-react";

import type { WorkpackStats } from "@/providers/OfflineSyncProvider";
import { useLanguage } from "@/shared/i18n";

type OfflineReadyCardProps = {
  stats: WorkpackStats | null;
  isPrefetching: boolean;
  isOnline: boolean;
  onRefresh: () => void;
};

function formatTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OfflineReadyCard({
  stats,
  isPrefetching,
  isOnline,
  onRefresh,
}: OfflineReadyCardProps) {
  const { t } = useLanguage();

  if (!isOnline || !stats || stats.taskCount === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Wifi className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">{t("operator.offlineReadyTitle")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("operator.offlineReadyBody")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isPrefetching}
          className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          title={t("operator.refreshCache")}
        >
          <RefreshCw className={`size-4 ${isPrefetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-lg font-bold text-slate-950">{stats.taskCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("operator.cachedTasks")}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-lg font-bold text-slate-950">{stats.templateCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("operator.cachedTemplates")}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-sm font-bold text-slate-950">{formatTime(stats.lastPrefetchedAt)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("operator.lastPrefetch")}
          </p>
        </div>
      </div>
    </section>
  );
}
