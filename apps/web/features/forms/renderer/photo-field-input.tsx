"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";

type PhotoFieldInputProps = {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(userAgent) || window.matchMedia("(pointer: coarse)").matches;
}

export function PhotoFieldInput({ value, readOnly = false, onChange }: PhotoFieldInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileMode, setMobileMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setMobileMode(isMobileDevice());
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploaded = await uploadEvidenceFile(file);
      onChange(uploaded.url);
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

  return (
    <div className="space-y-3">
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="aspect-video max-h-56 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Foto bukti" className="h-full w-full object-cover" />
          </div>

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
            {isUploading ? "Mengunggah..." : mobileMode ? "Ambil foto" : "Upload foto bukti"}
          </span>
          <span className="text-xs text-slate-500">
            {mobileMode ? "Kamera HP akan terbuka" : "Pilih file gambar dari perangkat"}
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
        accept="image/*"
        capture={mobileMode ? "environment" : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
    </div>
  );
}
