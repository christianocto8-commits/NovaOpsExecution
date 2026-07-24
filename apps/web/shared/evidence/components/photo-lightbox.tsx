"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useEvidenceDisplayUrl } from "../hooks/use-evidence-display-url";

type PhotoLightboxProps = {
  open: boolean;
  images: Array<{ url: string; caption?: string }>;
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function PhotoLightbox({
  open,
  images,
  activeIndex,
  onClose,
  onNavigate,
}: PhotoLightboxProps) {
  const current = images[activeIndex];
  const displayUrl = useEvidenceDisplayUrl(current?.url ?? "");
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < images.length - 1;

  const goPrevious = useCallback(() => {
    if (hasPrevious) onNavigate(activeIndex - 1);
  }, [activeIndex, hasPrevious, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(activeIndex + 1);
  }, [activeIndex, hasNext, onNavigate]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goNext, goPrevious, onClose, open]);

  if (!open || !current) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4">
      <button
        type="button"
        aria-label="Close lightbox"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{current.caption ?? "Evidence photo"}</p>
            {images.length > 1 ? (
              <p className="text-xs text-white/70">
                {activeIndex + 1} / {images.length}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {hasPrevious ? (
            <button
              type="button"
              onClick={goPrevious}
              className="absolute left-0 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={current.caption ?? "Evidence photo"}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
          ) : (
            <div className="flex h-64 w-full max-w-lg items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white/70">
              Loading evidence...
            </div>
          )}

          {hasNext ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="size-6" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
