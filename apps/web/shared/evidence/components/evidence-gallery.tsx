"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { uploadEvidenceFile } from "../upload-evidence";
import { EvidenceItem } from "../types";
import { EvidenceCard } from "./evidence-card";
import { UploadPlaceholder } from "./upload-placeholder";

type EvidenceGalleryProps = {
  value: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  readOnly?: boolean;
};

function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobilePattern = /android|iphone|ipad|ipod|mobile/;

  return mobilePattern.test(userAgent) || window.matchMedia("(pointer: coarse)").matches;
}

export function EvidenceGallery({ value, onChange, readOnly = false }: EvidenceGalleryProps) {
  const [draftCaption, setDraftCaption] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMobileMode(isMobileDevice());
  }, []);

  const helperText = useMemo(
    () =>
      mobileMode
        ? "Di HP akan langsung membuka kamera untuk ambil foto bukti."
        : "Di laptop akan membuka file explorer untuk memilih foto bukti.",
    [mobileMode]
  );

  function openFilePicker() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const nextItems = await Promise.all(
        files.map(async (file, index) => {
          const uploaded = await uploadEvidenceFile(file);

          return {
            id: `evidence-${Date.now()}-${index}`,
            url: uploaded.url,
            caption: draftCaption.trim() || file.name.replace(/\.[^.]+$/, "") || "Evidence",
            uploadedAt: new Date(uploaded.uploaded_at).toLocaleString(),
          } satisfies EvidenceItem;
        })
      );

      onChange([...value, ...nextItems]);
      setDraftCaption("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload evidence gagal.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removeEvidence(id: string) {
    onChange(value.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-950">Evidence Gallery</p>
          <p className="mt-1 text-sm text-slate-500">Dokumentasikan bukti pengerjaan task.</p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {value.length} item
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {value.map((item) => (
          <EvidenceCard
            key={item.id}
            item={item}
            onRemove={readOnly ? undefined : removeEvidence}
          />
        ))}

        {!readOnly ? (
          <UploadPlaceholder
            onAdd={openFilePicker}
            title={mobileMode ? "Ambil Foto Evidence" : "Upload Evidence"}
            description={mobileMode ? "Kamera HP akan terbuka" : "Pilih foto dari perangkat"}
          />
        ) : null}
      </div>

      {!readOnly ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={mobileMode ? "environment" : undefined}
            multiple={!mobileMode}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={draftCaption}
              onChange={(event) => setDraftCaption(event.target.value)}
              placeholder="Caption evidence"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />

            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploading}
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploading ? "Uploading..." : mobileMode ? "Buka Kamera" : "Pilih File"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">{helperText}</p>
          {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
        </>
      ) : null}
    </section>
  );
}
