"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";

import { outletService, type LegacyOutlet } from "@/services/outlet.service";
import { EnterpriseField, EnterpriseInput, EnterpriseSelect } from "@/shared/form";
import { SectionCard } from "@/shared/ui/cards/section-card";

type OutletGeofencePanelProps = {
  legacyOutletId?: number | null;
  outletName?: string;
  allowOutletSelection?: boolean;
  onNotice?: (message: string) => void;
};

function buildOsmEmbedUrl(latitude: number, longitude: number) {
  const delta = 0.008;
  const west = longitude - delta;
  const east = longitude + delta;
  const south = latitude - delta;
  const north = latitude + delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function OutletGeofencePanel({
  legacyOutletId = null,
  outletName,
  allowOutletSelection = false,
  onNotice,
}: OutletGeofencePanelProps) {
  const [outlets, setOutlets] = useState<LegacyOutlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | "">("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    void outletService
      .listMine()
      .then((items) => {
        setOutlets(items);

        if (items.length === 0) return;

        const preferred =
          legacyOutletId != null
            ? items.find((item) => item.id === legacyOutletId)
            : outletName
              ? items.find(
                  (item) =>
                    item.name === outletName ||
                    item.code === outletName ||
                    item.name.toLowerCase() === outletName.toLowerCase()
                )
              : items[0];

        const outlet = preferred ?? items[0];
        setSelectedOutletId(outlet.id);
        setRegion(outlet.region ?? "");
        setDistrict(outlet.district ?? "");
        setLatitude(outlet.latitude != null ? String(outlet.latitude) : "");
        setLongitude(outlet.longitude != null ? String(outlet.longitude) : "");
      })
      .catch(() => {
        onNotice?.("Unable to load outlet geofence data.");
      });
  }, [legacyOutletId, onNotice, outletName]);

  useEffect(() => {
    if (selectedOutletId === "") return;

    const outlet = outlets.find((item) => item.id === selectedOutletId);
    if (!outlet) return;

    setRegion(outlet.region ?? "");
    setDistrict(outlet.district ?? "");
    setLatitude(outlet.latitude != null ? String(outlet.latitude) : "");
    setLongitude(outlet.longitude != null ? String(outlet.longitude) : "");
  }, [outlets, selectedOutletId]);

  const parsedCoordinates = useMemo(() => {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon };
  }, [latitude, longitude]);

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      onNotice?.("Geolocation is not supported on this device.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      () => {
        onNotice?.("Unable to read current location. Check browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSaveLocation() {
    if (selectedOutletId === "") {
      onNotice?.("Select an outlet first.");
      return;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      onNotice?.("Latitude and longitude must be valid numbers.");
      return;
    }

    try {
      setIsSaving(true);
      const updatedRegion = await outletService.updateOutlet(selectedOutletId, {
        region: region.trim() || null,
        district: district.trim() || null,
      });
      const updated = await outletService.updateLocation(selectedOutletId, {
        latitude: lat,
        longitude: lon,
      });

      setOutlets((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                region: updatedRegion.region,
                district: updatedRegion.district,
                latitude: updated.latitude,
                longitude: updated.longitude,
              }
            : item
        )
      );
      onNotice?.(`Outlet ${updated.name} geofence saved.`);
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "Unable to save outlet geofence.");
    } finally {
      setIsSaving(false);
    }
  }

  if (outlets.length === 0) {
    return (
      <SectionCard title="Geofence & Location">
        <p className="text-sm text-slate-500">
          Outlet location data is not available for this account.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Geofence & Location"
      description="Set the outlet center coordinates used for geofence validation on task submission."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {allowOutletSelection ? (
          <EnterpriseField label="Outlet">
            <EnterpriseSelect
              value={selectedOutletId === "" ? "" : String(selectedOutletId)}
              onChange={(event) => setSelectedOutletId(Number(event.target.value))}
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </EnterpriseSelect>
          </EnterpriseField>
        ) : null}

        <EnterpriseField label="Region">
          <EnterpriseInput
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="e.g. Central Java"
          />
        </EnterpriseField>
        <EnterpriseField label="District">
          <EnterpriseInput
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="e.g. Semarang"
          />
        </EnterpriseField>
        <EnterpriseField label="Latitude">
          <EnterpriseInput
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="-6.966667"
          />
        </EnterpriseField>
        <EnterpriseField label="Longitude">
          <EnterpriseInput
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="110.416664"
          />
        </EnterpriseField>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleUseCurrentLocation()}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed className="size-4" />
          {isLocating ? "Locating..." : "Use current location"}
        </button>
        <button
          type="button"
          onClick={() => void handleSaveLocation()}
          disabled={isSaving || selectedOutletId === ""}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? "Saving..." : "Save geofence"}
        </button>
      </div>

      {parsedCoordinates ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
            <MapPin className="size-3.5 text-emerald-700" />
            Map preview (OpenStreetMap)
          </div>
          <iframe
            title="Outlet geofence map preview"
            src={buildOsmEmbedUrl(parsedCoordinates.lat, parsedCoordinates.lon)}
            className="h-56 w-full border-0"
            loading="lazy"
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Enter valid latitude and longitude to preview the outlet center on the map.
        </p>
      )}
    </SectionCard>
  );
}
