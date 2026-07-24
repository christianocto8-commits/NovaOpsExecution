"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, MapPin, Trash2, Upload } from "lucide-react";

import { useSettings } from "@/features/settings/hooks/use-settings";
import {
  getOfflineEvidenceBlobUrl,
  isOfflineEvidenceUrl,
} from "@/lib/offline/offline-evidence";
import { getPhotoDisplayUrl, parsePhotoFieldValue, serializePhotoFieldValue } from "@/shared/evidence/photo-value";
import { useEvidenceDisplayUrl } from "@/shared/evidence/hooks/use-evidence-display-url";
import { prepareEvidenceFile } from "@/shared/evidence/prepare-evidence-file";
import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";

type PhotoFieldInputProps = {
  value: string;
  readOnly?: boolean;
  outletName?: string;
  mediaMode?: "photo" | "video";
  onChange: (value: string) => void;
};

function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(userAgent) || window.matchMedia("(pointer: coarse)").matches;
}

export function PhotoFieldInput({
  value,
  readOnly = false,
  outletName,
  mediaMode = "photo",
  onChange,
}: PhotoFieldInputProps) {
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileMode] = useState(() => isMobileDevice());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);

  const parsedValue = useMemo(() => parsePhotoFieldValue(value), [value]);
  const displayUrlValue = parsedValue?.url ?? value;

  useEffect(() => {
    if (!displayUrlValue || !isOfflineEvidenceUrl(displayUrlValue)) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void getOfflineEvidenceBlobUrl(displayUrlValue).then((blobUrl) => {
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }

      objectUrl = blobUrl;
      setOfflineBlobUrl(blobUrl);
    });

    return () => {
      cancelled = true;
      setOfflineBlobUrl(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [displayUrlValue]);

  const resolvedDisplayUrl = useMemo(() => {
    if (!displayUrlValue) return "";
    if (isOfflineEvidenceUrl(displayUrlValue)) return offlineBlobUrl ?? "";
    return displayUrlValue;
  }, [displayUrlValue, offlineBlobUrl]);
  const authenticatedDisplayUrl = useEvidenceDisplayUrl(resolvedDisplayUrl);
  const displayUrl = authenticatedDisplayUrl || resolvedDisplayUrl;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const prepared = await prepareEvidenceFile(file, {
        timestampWatermark: settings?.timestamp_watermark ?? true,
        captureGps: settings?.gps_watermark ?? true,
        timezone: settings?.timezone ?? "Asia/Jakarta",
        outletName,
      });
      const uploaded = await uploadEvidenceFile(prepared.file, {
        geolocation: prepared.geolocation,
      });

      onChange(
        serializePhotoFieldValue({
          url: uploaded.url,
          latitude: uploaded.latitude ?? prepared.geolocation?.latitude,
          longitude: uploaded.longitude ?? prepared.geolocation?.longitude,
          accuracy_m: uploaded.accuracy_m ?? prepared.geolocation?.accuracy_m,
        })
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload foto gagal.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function openPicker() {
    if (readOnly || isUploading) return;
    setUploadError(null);
    fileInputRef.current?.click();
  }

  const locationLabel =
    parsedValue?.latitude != null && parsedValue.longitude != null
      ? `${parsedValue.latitude.toFixed(5)}, ${parsedValue.longitude.toFixed(5)}`
      : null;

  const isVideo = mediaMode === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(displayUrlValue);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="aspect-video max-h-56 w-full">
            {isVideo ? (
              <video src={displayUrl} controls className="h-full w-full object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={displayUrl} alt="Foto bukti" className="h-full w-full object-cover" />
            )}
          </div>

          {locationLabel ? (
            <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
              <MapPin className="size-3.5 shrink-0 text-emerald-700" />
              <a
                href={`https://maps.google.com/?q=${parsedValue?.latitude},${parsedValue?.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="truncate font-medium text-emerald-700 hover:text-emerald-800"
              >
                {locationLabel}
              </a>
            </div>
          ) : null}

          {!readOnly ? (
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-500">Foto sudah terunggah</p>
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                Hapus
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={readOnly || isUploading}
          onClick={openPicker}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="size-8 animate-spin text-emerald-700" />
          ) : mobileMode ? (
            <Camera className="size-8 text-emerald-700" />
          ) : (
            <ImageIcon className="size-8 text-emerald-700" />
          )}
          <span className="text-sm font-semibold">
            {isUploading
              ? "Mengunggah..."
              : mediaMode === "video"
                ? mobileMode
                  ? "Rekam video"
                  : "Upload video bukti"
                : mobileMode
                  ? "Ambil foto"
                  : "Upload foto bukti"}
          </span>
          <span className="text-xs text-slate-500">
            {mediaMode === "video"
              ? "MP4, WEBM, atau MOV"
              : mobileMode
                ? "Kamera HP akan terbuka"
                : "Pilih file gambar dari perangkat"}
          </span>
        </button>
      )}

      {!readOnly && value ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Upload className="size-4" />
          Ganti foto
        </button>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={mediaMode === "video" ? "video/mp4,video/webm,video/quicktime,video/*" : "image/*"}
        capture={mobileMode && mediaMode === "photo" ? "environment" : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
    </div>
  );
}

export { getPhotoDisplayUrl };
