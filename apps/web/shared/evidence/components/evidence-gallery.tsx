"use client";

import { useState } from "react";

import { EvidenceItem } from "../types";
import { EvidenceCard } from "./evidence-card";
import { UploadPlaceholder } from "./upload-placeholder";

type EvidenceGalleryProps = {
  value: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  readOnly?: boolean;
};

export function EvidenceGallery({
  value,
  onChange,
  readOnly = false,
}: EvidenceGalleryProps) {
  const [draftUrl, setDraftUrl] = useState("");
  const [draftCaption, setDraftCaption] = useState("");

  function addEvidence() {
    const cleanUrl = draftUrl.trim();

    if (!cleanUrl) return;

    const nextItem: EvidenceItem = {
      id: `evidence-${Date.now()}`,
      url: cleanUrl,
      caption: draftCaption.trim() || "Evidence",
      uploadedAt: new Date().toLocaleString(),
    };

    onChange([...value, nextItem]);
    setDraftUrl("");
    setDraftCaption("");
  }

  function removeEvidence(id: string) {
    onChange(value.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-950">Evidence Gallery</p>
          <p className="mt-1 text-sm text-slate-500">
            Dokumentasikan bukti pengerjaan task.
          </p>
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

        {!readOnly ? <UploadPlaceholder onAdd={addEvidence} /> : null}
      </div>

      {!readOnly ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="Image URL / evidence link"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
          />

          <input
            value={draftCaption}
            onChange={(event) => setDraftCaption(event.target.value)}
            placeholder="Caption"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
          />

          <button
            type="button"
            onClick={addEvidence}
            disabled={!draftUrl.trim()}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add
          </button>
        </div>
      ) : null}
    </section>
  );
}
