"use client";

import { Download, Share, X } from "lucide-react";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useToast } from "@/shared/toast";

type PwaInstallPromptProps = {
  compact?: boolean;
};

export function PwaInstallPrompt({ compact = false }: PwaInstallPromptProps) {
  const toast = useToast();
  const pwa = usePwaInstall();

  if (pwa.isInstalled || !pwa.canPrompt) {
    return null;
  }

  async function handleInstall() {
    if (pwa.isIos) {
      toast.info("Di iPhone/iPad: tap Share → Add to Home Screen.");
      return;
    }

    const installed = await pwa.promptInstall();

    if (installed) {
      toast.success("NovaOps terpasang di perangkat Anda.");
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={pwa.isLoading}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        <Download className="size-3.5" />
        Install app
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <button
        type="button"
        onClick={pwa.dismissPrompt}
        className="absolute right-3 top-3 rounded-full p-1 text-emerald-600 hover:bg-emerald-100"
        aria-label="Tutup"
      >
        <X className="size-4" />
      </button>

      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {pwa.isIos ? <Share className="mt-0.5 size-4 shrink-0" /> : <Download className="mt-0.5 size-4 shrink-0" />}
          <div>
            <p className="font-semibold">Pasang NovaOps di layar utama</p>
            <p className="mt-1 text-emerald-800/90">
              {pwa.isIos
                ? "Tap ikon Share di Safari, lalu pilih Add to Home Screen untuk akses cepat seperti app native."
                : "Install PWA untuk akses cepat task checklist — bahkan saat sinyal lemah."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={pwa.isLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pwa.isLoading ? "Memproses..." : pwa.isIos ? "Cara install" : "Install"}
        </button>
      </div>
    </div>
  );
}
