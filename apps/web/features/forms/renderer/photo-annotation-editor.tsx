"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, Loader2, PaintBucket, PenLine, TextIcon, Undo2, X } from "lucide-react";

import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";

type AnnotationTool = "pen" | "marker" | "text";

const TOOLS: { id: AnnotationTool; label: string; icon: typeof PenLine }[] = [
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "marker", label: "Sorot", icon: PaintBucket },
  { id: "text", label: "Teks", icon: TextIcon },
];

const COLORS = ["#dc2626", "#f59e0b", "#16a34a", "#2563eb", "#111827", "#ffffff"];

type PhotoAnnotationEditorProps = {
  src: string;
  onSave: (url: string) => void;
  onClose: () => void;
};

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function PhotoAnnotationEditor({ src, onSave, onClose }: PhotoAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const textAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const baseSnapshotRef = useRef<ImageData | null>(null);

  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [textPromptOpen, setTextPromptOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(image, 0, 0, width, height);
      baseSnapshotRef.current = context.getImageData(0, 0, width, height);
      undoStackRef.current = [];
      setHistoryCount(0);
      setDisplayCount(0);
      setIsImageLoaded(true);
    };
    image.onerror = () => {
      setSaveError("Gagal memuat foto untuk diedit.");
    };
    image.src = src;
  }, [src]);

  function pushUndoPoint() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    undoStackRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    setHistoryCount(undoStackRef.current.length);
  }

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const snapshot = undoStackRef.current.pop();
    setHistoryCount(undoStackRef.current.length);

    if (snapshot) {
      context.putImageData(snapshot, 0, 0);
      setDisplayCount((count) => count + 1);
    }
  }, []);

  const clearAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const base = baseSnapshotRef.current;
    if (!canvas || !context || !base) return;

    context.putImageData(base, 0, 0);
    undoStackRef.current = [];
    setHistoryCount(0);
    setSaveError(null);
  }, []);

  function beginStroke(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !isImageLoaded) return;

    const point = getCanvasPoint(canvas, clientX, clientY);

    if (tool === "text") {
      textAnchorRef.current = point;
      setPendingText("");
      setTextPromptOpen(true);
      return;
    }

    pushUndoPoint();
    isDrawingRef.current = true;

    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = tool === "marker" ? 16 : 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalAlpha = tool === "marker" ? 0.45 : 1;
    context.moveTo(point.x, point.y);
    lastPointRef.current = point;
  }

  function continueStroke(clientX: number, clientY: number) {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, clientX, clientY);
    const last = lastPointRef.current ?? point;

    context.lineTo(point.x, point.y);
    context.stroke();
    context.globalAlpha = 1;
    context.beginPath();
    context.moveTo(point.x, point.y);

    if (point.x !== last.x || point.y !== last.y) {
      setDisplayCount((count) => count + 1);
    }
    lastPointRef.current = point;
  }

  function endStroke() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function placePendingText() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !pendingText.trim()) {
      setTextPromptOpen(false);
      setPendingText("");
      return;
    }

    const anchor = textAnchorRef.current ?? {
      x: Math.round(canvas.width / 2),
      y: Math.round(canvas.height / 3),
    };

    pushUndoPoint();

    const fontSize = Math.max(24, Math.round(canvas.width * 0.035));
    context.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.fillStyle = color;
    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = Math.max(3, Math.round(fontSize * 0.18));
    context.lineJoin = "round";
    context.strokeText(pendingText.trim(), anchor.x, anchor.y);
    context.fillText(pendingText.trim(), anchor.x, anchor.y);

    setDisplayCount((count) => count + 1);
    setTextPromptOpen(false);
    setPendingText("");
    textAnchorRef.current = null;
  }

  async function saveAnnotation() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        throw new Error("Gagal membuat gambar anotasi.");
      }

      const file = new File([blob], `annotated-${Date.now()}.png`, { type: "image/png" });
      const uploaded = await uploadEvidenceFile(file);
      onSave(uploaded.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simpan anotasi gagal.";
      setSaveError(
        /tapered|security/i.test(message)
          ? "Foto tidak dapat diedit karena berasal dari sumber eksternal."
          : message
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Anotasi foto"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Edit foto</h2>
            <p className="text-xs text-slate-500">
              Gambar penanda, sorotan, atau teks di atas foto bukti.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTool(id);
                  setTextPromptOpen(false);
                  setPendingText("");
                }}
                title={label}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  tool === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={`Warna ${c}`}
                aria-label={`Pilih warna ${c}`}
                className={`size-6 rounded-full border transition ${
                  color === c
                    ? "scale-110 border-slate-900 ring-2 ring-slate-900/20"
                    : "border-slate-300 hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={!isImageLoaded || historyCount === 0}
              onClick={undo}
              title="Undo"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={clearAnnotations}
              title="Bersihkan anotasi"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Eraser className="size-4" />
              Bersihkan
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-slate-100 p-3 sm:p-4">
          {!isImageLoaded ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">
              {saveError ?? "Memuat foto..."}
            </div>
          ) : (
            <div className="mx-auto flex h-full min-h-72 w-full items-center justify-center">
              <canvas
                ref={canvasRef}
                className={`max-h-full max-w-full touch-none rounded-lg ${
                  tool === "text" ? "cursor-text" : "cursor-crosshair"
                }`}
                style={{ objectFit: "contain" }}
                onMouseDown={(event) => {
                  if (isSaving) return;
                  event.preventDefault();
                  beginStroke(event.clientX, event.clientY);
                }}
                onMouseMove={(event) => {
                  event.preventDefault();
                  continueStroke(event.clientX, event.clientY);
                }}
                onMouseUp={endStroke}
                onMouseLeave={endStroke}
                onTouchStart={(event) => {
                  if (isSaving) return;
                  const touch = event.touches[0];
                  if (!touch) return;
                  event.preventDefault();
                  beginStroke(touch.clientX, touch.clientY);
                }}
                onTouchMove={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  event.preventDefault();
                  continueStroke(touch.clientX, touch.clientY);
                }}
                onTouchEnd={endStroke}
              />
            </div>
          )}

          {textPromptOpen ? (
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <input
                autoFocus
                value={pendingText}
                onChange={(event) => setPendingText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") placePendingText();
                  if (event.key === "Escape") {
                    setTextPromptOpen(false);
                    setPendingText("");
                  }
                }}
                placeholder="Tulis teks, lalu Enter"
                className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
              <button
                type="button"
                disabled={!pendingText.trim()}
                onClick={placePendingText}
                aria-label="Tempatkan teks"
                className="inline-flex size-10 items-center justify-center rounded-lg text-white disabled:opacity-40"
                style={{ backgroundColor: color }}
              >
                <Check className="size-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            {displayCount > 0 ? "Anotasi siap disimpan." : "Belum ada anotasi."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void saveAnnotation()}
              disabled={isSaving || !isImageLoaded}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving ? "Menyimpan..." : "Simpan foto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
