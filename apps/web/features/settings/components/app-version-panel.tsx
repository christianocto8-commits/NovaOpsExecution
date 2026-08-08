"use client";

import { useAutoUpdate, CURRENT_APP_VERSION } from "@/providers/AutoUpdateProvider";
import { Download, RefreshCw, Smartphone, CheckCircle2, Sparkles } from "lucide-react";
import { SectionCard } from "@/shared/ui/cards/section-card";

export function AppVersionPanel() {
  const { hasUpdate, latestVersion, isChecking, checkNow, updateNow } = useAutoUpdate();

  return (
    <SectionCard title="Info Aplikasi & Pembaruan Otomatis">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold">
            <Smartphone className="size-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">NovaOps Outlet Mobile</h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                v{CURRENT_APP_VERSION.versionName} ({CURRENT_APP_VERSION.versionCode})
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Dioptimalkan untuk tablet Huawei MatePad 11.5S & Android Outlet.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void checkNow()}
            disabled={isChecking}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-60 transition-all"
          >
            <RefreshCw className={`size-4 ${isChecking ? "animate-spin text-emerald-600" : ""}`} />
            {isChecking ? "Memeriksa..." : "Cek Pembaruan"}
          </button>

          {hasUpdate ? (
            <button
              type="button"
              onClick={updateNow}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 active:scale-95 transition-all"
            >
              <Download className="size-4" />
              Perbarui Sekarang ({latestVersion?.latestVersionName})
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Aplikasi Terkini
            </span>
          )}
        </div>
      </div>

      {hasUpdate && latestVersion && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <Sparkles className="size-4 text-emerald-700" />
            Versi Baru Tersedia: v{latestVersion.latestVersionName}
          </div>
          <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
            {latestVersion.releaseNotes}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
