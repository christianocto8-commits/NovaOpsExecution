"use client";

import { MapPin } from "lucide-react";

import { useLanguage } from "@/shared/i18n";

type GeofenceStatusBannerProps = {
  enabled: boolean;
  hasOutletCoords: boolean;
  outletLat?: number | null;
  outletLon?: number | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  distanceMeters: number | null;
  radiusMeters: number;
};

function buildStaticMapUrl(lat: number, lon: number) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=120x80&markers=${lat},${lon},red-pushpin`;
}

export function GeofenceStatusBanner({
  enabled,
  hasOutletCoords,
  outletLat,
  outletLon,
  isLoadingLocation,
  locationError,
  distanceMeters,
  radiusMeters,
}: GeofenceStatusBannerProps) {
  const { t } = useLanguage();

  if (!enabled) return null;

  if (!hasOutletCoords) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <p>{t("geofence.noCoords")}</p>
      </div>
    );
  }

  if (isLoadingLocation && distanceMeters == null) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <MapPin className="mt-0.5 size-4 shrink-0 animate-pulse" />
        <p>{t("geofence.loadingGps")}</p>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <p>{locationError}</p>
      </div>
    );
  }

  if (distanceMeters == null) {
    return null;
  }

  const effectiveRadius = Math.max(25, radiusMeters);
  const inRadius = distanceMeters <= effectiveRadius;
  const showMapPreview =
    outletLat != null &&
    outletLon != null &&
    Number.isFinite(outletLat) &&
    Number.isFinite(outletLon);

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        inRadius
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      {showMapPreview ? (
        <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/60 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildStaticMapUrl(outletLat, outletLon)}
            alt={t("geofence.mapPreview")}
            className="size-[72px] object-cover"
            width={72}
            height={72}
          />
          <MapPin className="absolute bottom-1 right-1 size-4 text-red-600 drop-shadow" />
        </div>
      ) : (
        <MapPin className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {inRadius ? t("geofence.inRadius") : t("geofence.outsideRadius")}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {Math.round(distanceMeters)}m
          <span className="ml-2 text-sm font-semibold opacity-80">
            / {effectiveRadius}m {t("geofence.limit")}
          </span>
        </p>
        <p className="mt-0.5 text-xs opacity-80">{t("geofence.distanceHint")}</p>
      </div>
    </div>
  );
}
