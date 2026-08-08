"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpCircle, CheckCircle2, Download, RefreshCw, Sparkles, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { resolveApiUrl } from "@/lib/api-url";
import { useToast } from "@/shared/toast";

export type VersionInfo = {
  latestVersionName: string;
  latestVersionCode: number;
  required?: boolean;
  downloadUrl?: string;
  releaseNotes?: string;
};

export const CURRENT_APP_VERSION = {
  versionName: "1.0.1",
  versionCode: 2,
};

type AutoUpdateContextType = {
  hasUpdate: boolean;
  latestVersion: VersionInfo | null;
  isChecking: boolean;
  checkNow: () => Promise<void>;
  updateNow: () => void;
  dismissUpdate: () => void;
};

const AutoUpdateContext = createContext<AutoUpdateContextType>({
  hasUpdate: false,
  latestVersion: null,
  isChecking: false,
  checkNow: async () => {},
  updateNow: () => {},
  dismissUpdate: () => {},
});

export function useAutoUpdate() {
  return useContext(AutoUpdateContext);
}

export function AutoUpdateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchVersionInfo = useCallback(async (): Promise<VersionInfo | null> => {
    // In the Capacitor APK (offline bundle) the webview origin is a local
    // scheme, so relative URLs would hit stale bundled files — always use the
    // absolute API origin here (same host that serves the live web app).
    const apiBase = resolveApiUrl();

    const urls = apiBase
      ? [
          `${apiBase}/app-version.json?t=${Date.now()}`,
          `${apiBase}/api/v1/health/app-version?t=${Date.now()}`,
        ]
      : [
          `/app-version.json?t=${Date.now()}`,
          `/api/v1/health/app-version?t=${Date.now()}`,
        ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          return (await res.json()) as VersionInfo;
        }
      } catch {
        // Try next source
      }
    }

    return null;
  }, []);

  const checkNow = useCallback(async () => {
    setIsChecking(true);
    try {
      const info = await fetchVersionInfo();
      if (info) {
        setLatestVersion(info);
        if (info.latestVersionCode > CURRENT_APP_VERSION.versionCode) {
          setHasUpdate(true);
          setDismissed(false);
        } else {
          setHasUpdate(false);
        }
      }
    } catch {
      // Ignore background check failure
    } finally {
      setIsChecking(false);
    }
  }, [fetchVersionInfo]);

  useEffect(() => {
    void checkNow();
    // Periodically check every 20 minutes
    const interval = setInterval(() => {
      void checkNow();
    }, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkNow]);

  const updateNow = () => {
    if (Capacitor.isNativePlatform()) {
      // On native platform (Capacitor), reload webview or open APK download URL
      const targetUrl =
        latestVersion?.downloadUrl ?? "https://nova-ops.cloud/downloads/NovaOps-Outlet-MatePad.apk";
      toast.info("Mengunduh pembaruan aplikasi...");
      window.open(targetUrl, "_system");
    } else {
      // Web live mode: clear cache & reload
      toast.info("Memutakhirkan aplikasi...");
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setDismissed(true);
  };

  return (
    <AutoUpdateContext.Provider
      value={{
        hasUpdate: hasUpdate && !dismissed,
        latestVersion,
        isChecking,
        checkNow,
        updateNow,
        dismissUpdate,
      }}
    >
      {children}

      {/* Floating Auto-Update Notification Dialog */}
      {hasUpdate && !dismissed && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300 p-2 sm:p-0"
          role="dialog"
          aria-label="Pembaruan Aplikasi"
        >
          <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900 text-white shadow-2xl backdrop-blur-xl">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white">
                    <Sparkles className="size-4 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold leading-none">NovaOps Terkini</h3>
                    <p className="mt-0.5 text-[11px] text-emerald-100">
                      Versi {latestVersion?.latestVersionName ?? "Baru"} Tersedia
                    </p>
                  </div>
                </div>
                {!latestVersion?.required && (
                  <button
                    type="button"
                    onClick={dismissUpdate}
                    className="rounded-lg p-1 text-emerald-100 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {latestVersion?.releaseNotes ??
                  "Pembaruan baru tersedia dengan peningkatan stabilitas dan fitur operasional terbaru."}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={updateNow}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 active:scale-95 transition-all"
                >
                  <Download className="size-4" />
                  Perbarui Sekarang
                </button>

                {!latestVersion?.required && (
                  <button
                    type="button"
                    onClick={dismissUpdate}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    Nanti
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AutoUpdateContext.Provider>
  );
}
