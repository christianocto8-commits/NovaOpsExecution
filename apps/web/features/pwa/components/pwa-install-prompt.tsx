"use client";

import { Download, Share, X } from "lucide-react";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useLanguage } from "@/shared/i18n";
import { useToast } from "@/shared/toast";

type PwaInstallPromptProps = {
  compact?: boolean;
};

export function PwaInstallPrompt({ compact = false }: PwaInstallPromptProps) {
  const toast = useToast();
  const { t } = useLanguage();
  const pwa = usePwaInstall();

  if (pwa.isInstalled || !pwa.canPrompt) {
    return null;
  }

  async function handleInstall() {
    if (pwa.isIos) {
      toast.info(t("pwa.iosHint"));
      return;
    }

    const installed = await pwa.promptInstall();

    if (installed) {
      toast.success(t("pwa.installed"));
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={pwa.isLoading}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        <Download className="size-3.5" />
        {t("pwa.installCompact")}
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <button
        type="button"
        onClick={pwa.dismissPrompt}
        className="absolute right-3 top-3 rounded-full p-1 text-emerald-600 hover:bg-emerald-100"
        aria-label={t("pwa.dismiss")}
      >
        <X className="size-4" />
      </button>

      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {pwa.isIos ? (
            <Share className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Download className="mt-0.5 size-4 shrink-0" />
          )}
          <div>
            <p className="font-semibold">{t("pwa.title")}</p>
            <p className="mt-1 text-emerald-800/90">
              {pwa.isIos ? t("pwa.iosBody") : t("pwa.body")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={pwa.isLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pwa.isLoading ? t("pwa.processing") : pwa.isIos ? t("pwa.iosAction") : t("pwa.install")}
        </button>
      </div>
    </div>
  );
}
