"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { useSettings } from "@/features/settings/hooks/use-settings";
import {
  getOfflineEvidenceBlobUrl,
  isOfflineEvidenceUrl,
} from "@/lib/offline/offline-evidence";
import { getPhotoDisplayUrl, parsePhotoFieldValues, serializePhotoFieldValues } from "@/shared/evidence/photo-value";
import { useEvidenceDisplayUrl } from "@/shared/evidence/hooks/use-evidence-display-url";
import { prepareEvidenceFile } from "@/shared/evidence/prepare-evidence-file";
import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";
import { PhotoAnnotationEditor } from "./photo-annotation-editor";

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

function LocationLabel({
  latitude,
  longitude,
}: {
  latitude?: number;
  longitude?: number;
}) {
  if (latitude == null || longitude == null) return null;

  const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return (
    <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
      <MapPin className="size-3.5 shrink-0 text-emerald-700" />
      <a
        href={`https://maps.google.com/?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="truncate font-medium text-emerald-700 hover:text-emerald-800"
      >
        {label}
      </a>
    </div>
  );
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
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);

  const parsedValues = useMemo(() => parsePhotoFieldValues(value), [value]);
  const singleUrlValue = parsedValues[0]?.url ?? "";
  const isVideo = mediaMode === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(singleUrlValue);
  const isMultiPhoto = mediaMode !== "video" && parsedValues.length > 1;

  useEffect(() => {
    if (!singleUrlValue || !isOfflineEvidenceUrl(singleUrlValue)) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void getOfflineEvidenceBlobUrl(singleUrlValue).then((blobUrl) => {
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
  }, [singleUrlValue]);

  const resolvedDisplayUrl = useMemo(() => {
    if (!singleUrlValue) return "";
    if (isOfflineEvidenceUrl(singleUrlValue)) return offlineBlobUrl ?? "";
    return singleUrlValue;
  }, [singleUrlValue, offlineBlobUrl]);
  const authenticatedDisplayUrl = useEvidenceDisplayUrl(resolvedDisplayUrl);
  const displayUrl = authenticatedDisplayUrl || resolvedDisplayUrl;

  async function uploadFile(file: File) {
    const prepared = await prepareEvidenceFile(file, {
      timestampWatermark: settings?.timestamp_watermark ?? true,
      captureGps: settings?.gps_watermark ?? true,
      timezone: settings?.timezone ?? "Asia/Jakarta",
      outletName,
    });
    const uploaded = await uploadEvidenceFile(prepared.file, {
      geolocation: prepared.geolocation,
    });

    return {
      url: uploaded.url,
      latitude: uploaded.latitude ?? prepared.geolocation?.latitude,
      longitude: uploaded.longitude ?? prepared.geolocation?.longitude,
      accuracy_m: uploaded.accuracy_m ?? prepared.geolocation?.accuracy_m,
      captured_at: Date.now(),
    };
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedPhotos = [];

      for (const file of files) {
        uploadedPhotos.push(await uploadFile(file));
      }

      onChange(serializePhotoFieldValues([...parsedValues, ...uploadedPhotos]));
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

  function removePhoto(index: number) {
    const next = parsedValues.filter((_, i) => i !== index);
    onChange(serializePhotoFieldValues(next));
  }

  function handleAnnotationSaved(index: number, url: string) {
    const next = parsedValues.map((photo, i) => (i === index ? { ...photo, url } : photo));
    onChange(serializePhotoFieldValues(next));
    setAnnotatingIndex(null);
  }

  function renderThumbnail(photo: (typeof parsedValues)[number], index: number) {
    return (
      <div
        key={photo.url}
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      >
        <div className="aspect-video w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPhotoDisplayUrl(photo.url)}
            alt={`Foto bukti ${index + 1}`}
            className="h-full w-full object-cover"
          />
        </div>

        <LocationLabel latitude={photo.latitude} longitude={photo.longitude} />

        {!readOnly ? (
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnnotatingIndex(index)}
              aria-label="Edit foto"
              title="Anotasi foto"
              className="inline-flex size-7 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-emerald-600"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removePhoto(index)}
              aria-label="Hapus foto"
              className="inline-flex size-7 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parsedValues.length > 0 ? (
        isVideo ? (          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="aspect-video max-h-56 w-full">
              <video src={displayUrl} controls className="h-full w-full object-cover" />
            </div>

            <LocationLabel latitude={parsedValues[0].latitude} longitude={parsedValues[0].longitude} />

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
          <div className={`grid gap-3 ${isMultiPhoto ? "grid-cols-2" : ""}`}>
            {parsedValues.map(renderThumbnail)}
          </div>
        )
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
                : "Pilih satu atau lebih foto"}
          </span>
        </button>
      )}

      {!readOnly && parsedValues.length > 0 && !isVideo ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Tambah foto
        </button>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple={mediaMode !== "video"}
        accept={mediaMode === "video" ? "video/mp4,video/webm,video/quicktime,video/*" : "image/*"}
        capture={mobileMode && mediaMode === "photo" ? "environment" : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}

      {annotatingIndex != null && parsedValues[annotatingIndex] ? (
        <AnnotationOverlay
          photo={parsedValues[annotatingIndex]}
          index={annotatingIndex}
          onSave={handleAnnotationSaved}
          onClose={() => setAnnotatingIndex(null)}
        />
      ) : null}
    </div>
  );
}

function AnnotationOverlay({
  photo,
  index,
  onSave,
  onClose,
}: {
  photo: { url: string };
  index: number;
  onSave: (index: number, url: string) => void;
  onClose: () => void;
}) {
  const resolvedDisplayUrl = useEvidenceDisplayUrl(getPhotoDisplayUrl(photo.url));
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (isOfflineEvidenceUrl(getPhotoDisplayUrl(photo.url))) {
      void getOfflineEvidenceBlobUrl(getPhotoDisplayUrl(photo.url)).then((blobUrl) => {
        if (blobUrl) setSrc(blobUrl);
      });
      return;
    }
    setSrc(resolvedDisplayUrl);
  }, [photo.url, resolvedDisplayUrl]);

  if (!src) return null;

  return (
    <PhotoAnnotationEditor
      src={src}
      onSave={(url) => onSave(index, url)}
      onClose={onClose}
    />
  );
}

export { getPhotoDisplayUrl };