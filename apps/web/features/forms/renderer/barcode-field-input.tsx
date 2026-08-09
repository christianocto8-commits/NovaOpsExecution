"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanLine } from "lucide-react";

type BarcodeFieldInputProps = {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector():
  (new (options?: { formats?: string[] }) => BarcodeDetectorLike) | null {
  if (typeof window === "undefined") return null;

  const detector = (window as Window & { BarcodeDetector?: unknown }).BarcodeDetector;
  return typeof detector === "function"
    ? (detector as new (options?: { formats?: string[] }) => BarcodeDetectorLike)
    : null;
}

export function BarcodeFieldInput({ value, readOnly = false, onChange }: BarcodeFieldInputProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannerAvailable, setScannerAvailable] = useState(false);

  useEffect(() => {
    setScannerAvailable(Boolean(getBarcodeDetector()));
  }, []);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  function stopScanning() {
    if (scanTimerRef.current != null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  async function startScanning() {
    const BarcodeDetectorCtor = getBarcodeDetector();
    if (!BarcodeDetectorCtor || readOnly) return;

    setScanError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stopScanning();
        return;
      }

      video.srcObject = stream;
      await video.play();
      setIsScanning(true);

      const detector = new BarcodeDetectorCtor({
        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
      });

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;

        try {
          const results = await detector.detect(videoRef.current);
          const rawValue = results[0]?.rawValue?.trim();
          if (rawValue) {
            onChange(rawValue);
            stopScanning();
          }
        } catch {
          // Ignore transient scan errors while camera is warming up.
        }
      }, 500);
    } catch {
      setScanError("Kamera tidak tersedia. Masukkan kode secara manual.");
      stopScanning();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Scan atau ketik kode barcode / QR..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
        />

        {!readOnly && scannerAvailable ? (
          <button
            type="button"
            onClick={() => void (isScanning ? stopScanning() : startScanning())}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            {isScanning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
            {isScanning ? "Berhenti" : "Scan Kamera"}
          </button>
        ) : null}
      </div>

      {!readOnly && !scannerAvailable ? (
        <p className="text-xs text-slate-500">
          Browser tidak mendukung BarcodeDetector API. Masukkan kode secara manual.
        </p>
      ) : null}

      {scanError ? <p className="text-xs text-red-600">{scanError}</p> : null}

      {isScanning ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          <p className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300">
            <Camera className="size-3.5" />
            Arahkan kamera ke barcode atau QR code
          </p>
        </div>
      ) : null}
    </div>
  );
}
