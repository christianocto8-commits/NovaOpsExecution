"use client";

import { useCallback, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

import { useToast } from "@/shared/toast";

type GpsFieldInputProps = {
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
};

function formatGpsResponse(lat: number, lng: number, accuracy: number | null) {
  const parts = [`lat:${lat.toFixed(6)}`, `lng:${lng.toFixed(6)}`];
  if (accuracy != null) parts.push(`acc:${Math.round(accuracy)}m`);
  return parts.join(" | ");
}

export function GpsFieldInput({ value, readOnly, onChange }: GpsFieldInputProps) {
  const toast = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung di browser ini.");
      return;
    }

    setIsCapturing(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const formatted = formatGpsResponse(latitude, longitude, accuracy);
        onChange(formatted);
        setIsCapturing(false);
        toast.success("Lokasi GPS berhasil dicatat.");
      },
      (error) => {
        setIsCapturing(false);
        const isDenied = error.code === GeolocationPositionError.PERMISSION_DENIED;
        toast.error(
          isDenied
            ? "Akses GPS ditolak. Izinkan akses lokasi untuk mencatat koordinat."
            : "Gagal menangkap lokasi GPS."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onChange, toast]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        placeholder={readOnly ? "Koordinat GPS" : "Tekan tangkap untuk catat lokasi"}
        className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
      />
      {!readOnly ? (
        <button
          type="button"
          onClick={capture}
          disabled={isCapturing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCapturing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          {isCapturing ? "Menangkap..." : "Tangkap"}
        </button>
      ) : null}
    </div>
  );
}
