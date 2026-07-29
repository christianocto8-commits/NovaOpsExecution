"use client";

import React from "react";

import { useOfflineSync } from "./use-offline-sync";

/**
 * Offline Sync Status Banner
 * Shows at top of screen when:
 * - Device is offline → red "Offline Mode" banner
 * - Device is on slow connection → yellow "Slow Connection" banner
 * - Sync is in progress → blue "Syncing..." banner
 * - Sync completed → green "X submissions synced" banner
 * - Pending items exist → amber badge with count
 */
export function OfflineSyncBanner() {
  const { isOnline, connectionQuality, pendingCount, syncStatus, syncedCount, triggerSync } =
    useOfflineSync();

  if (isOnline && pendingCount === 0 && syncStatus === "idle") {
    return null;
  }

  return (
    <div className="offline-sync-banner-wrapper">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner offline-banner--offline">
          <span className="offline-banner__icon">📵</span>
          <span className="offline-banner__text">
            Offline Mode — Data tersimpan lokal & akan dikirim otomatis saat online kembali
          </span>
          {pendingCount > 0 && (
            <span className="offline-banner__badge">{pendingCount} antrian</span>
          )}
        </div>
      )}

      {/* Slow Connection Banner */}
      {isOnline && connectionQuality === "slow" && (
        <div className="offline-banner offline-banner--slow">
          <span className="offline-banner__icon">🐢</span>
          <span className="offline-banner__text">Koneksi lambat terdeteksi</span>
        </div>
      )}

      {/* Syncing Banner */}
      {syncStatus === "syncing" && (
        <div className="offline-banner offline-banner--syncing">
          <span className="offline-banner__icon offline-banner__icon--spin">⟳</span>
          <span className="offline-banner__text">Menyinkronisasi data offline...</span>
        </div>
      )}

      {/* Synced Banner */}
      {syncStatus === "synced" && (
        <div className="offline-banner offline-banner--synced">
          <span className="offline-banner__icon">✅</span>
          <span className="offline-banner__text">
            {syncedCount} submission berhasil disinkronkan
          </span>
        </div>
      )}

      {/* Error Banner */}
      {syncStatus === "error" && (
        <div className="offline-banner offline-banner--error">
          <span className="offline-banner__icon">⚠️</span>
          <span className="offline-banner__text">Sebagian data gagal disinkronkan</span>
          <button className="offline-banner__retry" onClick={triggerSync}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Pending Items Badge (when online but queue has items) */}
      {isOnline && pendingCount > 0 && syncStatus === "idle" && (
        <div className="offline-banner offline-banner--pending">
          <span className="offline-banner__icon">📤</span>
          <span className="offline-banner__text">
            {pendingCount} submission offline menunggu sinkronisasi
          </span>
          <button className="offline-banner__retry" onClick={triggerSync}>
            Sinkronkan Sekarang
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline indicator for use in navigation header.
 * Shows a small colored dot + count.
 */
export function OfflineSyncIndicator() {
  const { isOnline, pendingCount, syncStatus, triggerSync } = useOfflineSync();

  const getColor = () => {
    if (!isOnline) return "#ef4444"; // red
    if (syncStatus === "syncing") return "#3b82f6"; // blue
    if (syncStatus === "synced") return "#22c55e"; // green
    if (syncStatus === "error") return "#f97316"; // orange
    if (pendingCount > 0) return "#f59e0b"; // amber
    return "#22c55e"; // green = all good
  };

  const getTitle = () => {
    if (!isOnline) return `Offline — ${pendingCount} item antrian`;
    if (syncStatus === "syncing") return "Menyinkronkan...";
    if (syncStatus === "synced") return "Tersinkronkan";
    if (pendingCount > 0) return `${pendingCount} item menunggu sync`;
    return "Online";
  };

  return (
    <button
      className="offline-indicator"
      title={getTitle()}
      onClick={isOnline && pendingCount > 0 ? triggerSync : undefined}
      style={{ cursor: isOnline && pendingCount > 0 ? "pointer" : "default" }}
    >
      <span
        className="offline-indicator__dot"
        style={{ backgroundColor: getColor() }}
      />
      {pendingCount > 0 && (
        <span className="offline-indicator__count">{pendingCount}</span>
      )}
    </button>
  );
}
