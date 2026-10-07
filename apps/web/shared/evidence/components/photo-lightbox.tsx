"use client";

import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const rotateClockwise = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const goPrevious = useCallback(() => {
    if (hasPrevious) {
      resetTransform();
      onNavigate(activeIndex - 1);
    }
  }, [activeIndex, hasPrevious, onNavigate, resetTransform]);

  const goNext = useCallback(() => {
    if (hasNext) {
      resetTransform();
      onNavigate(activeIndex + 1);
    }
  }, [activeIndex, hasNext, onNavigate, resetTransform]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "+" || event.key === "=") zoomIn();
      if (event.key === "-") zoomOut();
      if (event.key === "r" || event.key === "R") rotateClockwise();
      if (event.key === "0") resetTransform();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goNext, goPrevious, onClose, open, rotateClockwise, resetTransform, zoomIn, zoomOut]);

  if (!open || !current) return null;

  const isTransformed = zoom !== 1 || rotation !== 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close lightbox"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col">
        {/* Header Bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{current.caption ?? "Evidence photo"}</p>
            {images.length > 1 ? (
              <p className="text-xs text-white/70">
                {activeIndex + 1} / {images.length}
              </p>
            ) : null}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-xl p-2 text-white/90 transition hover:bg-white/20 active:scale-95"
              title="Perkecil (Zoom Out)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="min-w-[42px] text-center text-xs font-bold text-white/80">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-xl p-2 text-white/90 transition hover:bg-white/20 active:scale-95"
              title="Perbesar (Zoom In)"
              aria-label="Zoom In"
            >
              <ZoomIn className="size-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={rotateCounterClockwise}
              className="rounded-xl p-2 text-white/90 transition hover:bg-white/20 active:scale-95"
              title="Putar Kiri (-90°)"
              aria-label="Rotate Counter-Clockwise"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={rotateClockwise}
              className="rounded-xl p-2 text-white/90 transition hover:bg-white/20 active:scale-95"
              title="Putar Kanan (+90°)"
              aria-label="Rotate Clockwise"
            >
              <RotateCw className="size-4" />
            </button>

            {isTransformed ? (
              <>
                <div className="mx-1 h-4 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={resetTransform}
                  className="rounded-xl px-2.5 py-1 text-xs font-bold text-emerald-300 transition hover:bg-white/20 active:scale-95"
                  title="Reset Tampilan"
                >
                  Reset
                </button>
              </>
            ) : null}

            <div className="mx-1 h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white/90 transition hover:bg-white/20 active:scale-95"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-4">
          {hasPrevious ? (
            <button
              type="button"
              onClick={goPrevious}
              className="absolute left-4 z-20 rounded-full bg-white/10 p-3 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 active:scale-95"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          {displayUrl ? (
            <div className="flex max-h-[75vh] items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={current.caption ?? "Evidence photo"}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 180ms ease-out",
                }}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl select-none"
              />
            </div>
          ) : (
            <div className="flex h-64 w-full max-w-lg items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white/70">
              Loading evidence...
            </div>
          )}

          {hasNext ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 z-20 rounded-full bg-white/10 p-3 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 active:scale-95"
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
