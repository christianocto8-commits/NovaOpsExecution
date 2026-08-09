"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Loader2, PenLine } from "lucide-react";

import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";

type SignatureFieldInputProps = {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
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

export function SignatureFieldInput({
  value,
  readOnly = false,
  onChange,
}: SignatureFieldInputProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"saved" | "draw">(value ? "saved" : "draw");

  useEffect(() => {
    setMode(value ? "saved" : "draw");
  }, [value]);

  useEffect(() => {
    if (mode !== "draw") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const parentWidth = canvas.parentElement?.clientWidth ?? 320;
      canvas.width = Math.max(parentWidth, 280);
      canvas.height = 180;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#0f172a";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
      hasStrokeRef.current = false;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [mode]);

  function startDrawing(clientX: number, clientY: number) {
    if (readOnly || isUploading) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    isDrawingRef.current = true;
    const point = getCanvasPoint(canvas, clientX, clientY);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function continueDrawing(clientX: number, clientY: number) {
    if (!isDrawingRef.current || readOnly || isUploading) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, clientX, clientY);
    context.lineTo(point.x, point.y);
    context.stroke();
    hasStrokeRef.current = true;
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    setUploadError(null);
  }

  async function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      setUploadError("Gambar tanda tangan masih kosong.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        throw new Error("Gagal membuat file tanda tangan.");
      }

      const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
      const uploaded = await uploadEvidenceFile(file);
      onChange(uploaded.url);
      setMode("saved");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Simpan tanda tangan gagal.");
    } finally {
      setIsUploading(false);
    }
  }

  if (mode === "saved" && value) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Tanda tangan" className="h-44 w-full bg-white object-contain" />
        </div>

        {!readOnly ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setMode("draw");
              setUploadError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <PenLine className="size-4" />
            Tanda tangan ulang
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-none"
          onMouseDown={(event) => startDrawing(event.clientX, event.clientY)}
          onMouseMove={(event) => continueDrawing(event.clientX, event.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            startDrawing(touch.clientX, touch.clientY);
          }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            event.preventDefault();
            continueDrawing(touch.clientX, touch.clientY);
          }}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-xs text-slate-500">Gambar tanda tangan di kotak putih di atas.</p>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={clearCanvas}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            <Eraser className="size-4" />
            Hapus
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => void saveSignature()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PenLine className="size-4" />
            )}
            {isUploading ? "Menyimpan..." : "Simpan tanda tangan"}
          </button>
        </div>
      ) : null}

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
    </div>
  );
}
