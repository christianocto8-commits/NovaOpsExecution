"use client";

import { Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { switchCrewLogout } from "@/services/auth.service";
import { useToast } from "@/shared/toast";

type QuickCrewSwitchProps = {
  outletName?: string;
  compact?: boolean;
};

export function QuickCrewSwitch({ outletName, compact = false }: QuickCrewSwitchProps) {
  const pathname = usePathname();
  const toast = useToast();

  function handleSwitch() {
    const returnUrl = pathname.startsWith("/") ? pathname : "/dashboard/operator";

    switchCrewLogout(returnUrl);
    toast.info(outletName ? `Ganti crew — outlet ${outletName} tetap diingat.` : "Ganti crew — silakan login.");
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSwitch}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        title="Ganti crew di tablet bersama"
      >
        <Users className="size-3.5" />
        Ganti crew
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:bg-slate-50"
    >
      <div>
        <p className="text-sm font-bold text-slate-900">Ganti crew</p>
        <p className="text-xs text-slate-500">
          Logout cepat untuk tablet bersama{outletName ? ` · ${outletName}` : ""}
        </p>
      </div>
      <Users className="size-5 text-slate-500" />
    </button>
  );
}
