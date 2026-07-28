"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";

import { deleteMutation, getFailedMutations, updateMutation } from "@/lib/offline/store";
import type { QueuedMutation } from "@/lib/offline/types";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { useLanguage } from "@/shared/i18n";
import { useToast } from "@/shared/toast";
import { taskService, type BackendTask } from "@/services/task.service";

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
  const [isOpen, setIsOpen] = useState(false);
  const [failedItems, setFailedItems] = useState<QueuedMutation[]>([]);
  const [compareItemId, setCompareItemId] = useState<string | null>(null);
  const [serverVersions, setServerVersions] = useState<Record<string, BackendTask | null>>({});
  const lastReportedErrorsRef = useRef<string>("");

  async function refreshFailedItems() {
    setFailedItems(await getFailedMutations());
  }

  async function toggleDetails() {
    if (failedSyncCount === 0) {
      void syncNow();
      return;
    }

    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      await refreshFailedItems();
    }
  }

  async function compareConflict(item: QueuedMutation) {
    setCompareItemId((current) => (current === item.id ? null : item.id));
    if (serverVersions[item.id] !== undefined) return;

    try {
      const serverTask = await taskService.getBackendTask(item.taskId);
      setServerVersions((current) => ({ ...current, [item.id]: serverTask }));
    } catch {
      setServerVersions((current) => ({ ...current, [item.id]: null }));
    }
  }

  async function retryOfflineCopy(item: QueuedMutation) {
    await updateMutation({
      ...item,
      status: "pending",
      error: undefined,
      retryCount: 0,
      lastAttemptAt: undefined,
    });
    await refreshFailedItems();
    await syncNow();
  }

  async function discardOfflineCopy(item: QueuedMutation) {
    await deleteMutation(item.id);
    await refreshFailedItems();
  }

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
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggleDetails()}
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

      {isOpen && hasFailures ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(90vw,360px)] rounded-2xl border border-red-100 bg-white p-3 text-left shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-950">Offline sync errors</p>
            <button type="button" onClick={() => void syncNow()} className="text-xs font-bold text-emerald-700">
              Retry all
            </button>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {failedItems.map((item) => (
              <div key={item.id} className="rounded-xl bg-red-50 p-3 text-xs text-red-800">
                <p className="font-bold text-red-900">{item.label ?? item.type}</p>
                <p className="mt-1 break-words">{item.error ?? "Sync failed."}</p>
                <p className="mt-1 text-red-600">
                  Retry {item.retryCount ?? 0}x {item.lastAttemptAt ? `- ${new Date(item.lastAttemptAt).toLocaleString()}` : ""}
                </p>
                {item.status === "conflict" ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void compareConflict(item)} className="rounded-lg bg-white px-2 py-1 font-bold text-red-700">
                        Compare
                      </button>
                      <button type="button" onClick={() => void retryOfflineCopy(item)} className="rounded-lg bg-emerald-700 px-2 py-1 font-bold text-white">
                        Retry offline copy
                      </button>
                      <button type="button" onClick={() => void discardOfflineCopy(item)} className="rounded-lg bg-slate-900 px-2 py-1 font-bold text-white">
                        Discard
                      </button>
                    </div>
                    {compareItemId === item.id ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg bg-white p-2">
                          <p className="font-bold text-slate-900">Server version</p>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">
                            {serverVersions[item.id] === undefined
                              ? "Loading..."
                              : JSON.stringify(serverVersions[item.id] ?? { error: "Server task unavailable" }, null, 2)}
                          </pre>
                        </div>
                        <div className="rounded-lg bg-white p-2">
                          <p className="font-bold text-slate-900">Offline version</p>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
