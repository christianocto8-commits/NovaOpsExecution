/* eslint-disable @next/next/no-img-element */

"use client";

import { ImageIcon, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";

import { EvidenceItem } from "../types";
import { useEvidenceDisplayUrl } from "../hooks/use-evidence-display-url";
import { PhotoLightbox } from "./photo-lightbox";

type EvidenceCardProps = {
  item: EvidenceItem;
  onRemove?: (id: string) => void;
};

export function EvidenceCard({ item, onRemove }: EvidenceCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const displayUrl = useEvidenceDisplayUrl(item.url);
  const hasLocation = item.latitude != null && item.longitude != null;

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => displayUrl && setLightboxOpen(true)}
          className="flex aspect-video w-full items-center justify-center bg-slate-50"
          aria-label="Open evidence photo"
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={item.caption ?? "Evidence"}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </button>

        <div className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">
              {item.caption ?? "Evidence"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{item.uploadedAt ?? "Saved evidence"}</p>
            {hasLocation ? (
              <a
                href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
              >
                <MapPin className="size-3" />
                {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
              </a>
            ) : null}
          </div>

          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <PhotoLightbox
        open={lightboxOpen}
        images={[{ url: displayUrl || item.url, caption: item.caption }]}
        activeIndex={0}
        onClose={() => setLightboxOpen(false)}
        onNavigate={() => undefined}
      />
    </>
  );
}
