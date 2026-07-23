"use client";

import { Search } from "lucide-react";
import { useCommandCenter } from "../hooks/use-command-center";
import { useLanguage } from "@/shared/i18n";

type CommandTriggerProps = {
  compact?: boolean;
};

export function CommandTrigger({ compact = false }: CommandTriggerProps) {
  const { setOpen } = useCommandCenter();
  const { t } = useLanguage();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC] md:hidden"
        aria-label={t("header.search")}
      >
        <Search className="size-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="hidden min-w-48 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white md:flex lg:min-w-72"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        {t("header.searchPlaceholder")}
      </span>

      <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
        Ctrl K
      </span>
    </button>
  );
}
