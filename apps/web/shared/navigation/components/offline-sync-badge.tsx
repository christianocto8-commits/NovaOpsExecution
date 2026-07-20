"use client";

import { CloudOff, RefreshCw } from "lucide-react";

import { useOfflineSync } from "@/providers/OfflineSyncProvider";

export function OfflineSyncBadge() {
  const { isOnline, pendingSyncCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={!isOnline || isSyncing}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        isOnline
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-slate-300 bg-slate-100 text-slate-700",
      ].join(" ")}
      title={isOnline ? "Tap to sync pending changes" : "Offline — changes queued locally"}
    >
      {isSyncing ? (
        <RefreshCw className="size-3.5 animate-spin" />
      ) : (
        <CloudOff className="size-3.5" />
      )}
      {!isOnline ? "Offline" : null}
      {pendingSyncCount > 0 ? `${pendingSyncCount} pending` : isSyncing ? "Syncing…" : null}
    </button>
  );
}
