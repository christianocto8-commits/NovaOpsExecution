"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";

import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { useLanguage } from "@/shared/i18n";
import { useToast } from "@/shared/toast";

export function OfflineSyncBadge() {
  const { t } = useLanguage();
  const toast = useToast();
  const {
    isOnline,
    pendingSyncCount,
    failedSyncCount,
    isSyncing,
    lastSyncErrors,
    syncNow,
  } = useOfflineSync();
  const lastReportedErrorsRef = useRef<string>("");

  useEffect(() => {
    if (lastSyncErrors.length === 0) return;

    const signature = lastSyncErrors.join("|");
    if (signature === lastReportedErrorsRef.current) return;

    lastReportedErrorsRef.current = signature;
    toast.error(
      lastSyncErrors.length === 1
        ? t("offline.toast.singleError", { message: lastSyncErrors[0] })
        : t("offline.toast.multiError", { count: lastSyncErrors.length })
    );
  }, [lastSyncErrors, t, toast]);

  if (isOnline && pendingSyncCount === 0 && failedSyncCount === 0 && !isSyncing) {
    return null;
  }

  const hasFailures = failedSyncCount > 0;

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={!isOnline || isSyncing}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        hasFailures
          ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
          : isOnline
            ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-slate-300 bg-slate-100 text-slate-700",
      ].join(" ")}
      title={
        hasFailures
          ? (lastSyncErrors[0] ?? t("offline.title.failed"))
          : isOnline
            ? t("offline.title.sync")
            : t("offline.title.offline")
      }
    >
      {isSyncing ? (
        <RefreshCw className="size-3.5 animate-spin" />
      ) : hasFailures ? (
        <AlertTriangle className="size-3.5" />
      ) : (
        <CloudOff className="size-3.5" />
      )}
      {!isOnline ? t("offline.badge.offline") : null}
      {hasFailures ? t("offline.badge.failed", { count: failedSyncCount }) : null}
      {!hasFailures && pendingSyncCount > 0
        ? t("offline.badge.pending", { count: pendingSyncCount })
        : null}
      {!hasFailures && pendingSyncCount === 0 && isSyncing ? t("offline.badge.syncing") : null}
    </button>
  );
}
