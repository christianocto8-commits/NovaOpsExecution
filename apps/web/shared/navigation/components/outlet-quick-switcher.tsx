"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Search, Store, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getIdentityOutlets } from "@/services/identity.service";
import { setStoredOutletContext } from "../workspace-store";
import type { CurrentWorkspace } from "../role-config";

type OutletQuickSwitcherProps = {
  workspace: CurrentWorkspace;
};

export function OutletQuickSwitcher({ workspace }: OutletQuickSwitcherProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const outletsQuery = useQuery({
    queryKey: ["identity-outlets"],
    queryFn: getIdentityOutlets,
    staleTime: 5 * 60 * 1000,
  });

  // Combine user's assigned outlets (e.g. for Area Manager) with identity outlets
  const outlets = useMemo(() => {
    const list: Array<{ id: string; name: string; code: string }> = [];
    const seen = new Set<string>();

    const userAssigned = user?.outlet_access?.outlets ?? [];
    for (const o of userAssigned) {
      if (o.id && !seen.has(o.id)) {
        seen.add(o.id);
        list.push({ id: o.id, name: o.name, code: o.code });
      }
    }

    const fetched = outletsQuery.data ?? [];
    for (const o of fetched) {
      if (o.id && !seen.has(o.id)) {
        seen.add(o.id);
        list.push({ id: o.id, name: o.name, code: o.code });
      }
    }

    return list;
  }, [user?.outlet_access?.outlets, outletsQuery.data]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredOutlets = useMemo(() => {
    if (!search.trim()) return outlets;
    const term = search.toLowerCase();
    return outlets.filter(
      (o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term)
    );
  }, [outlets, search]);

  function handleSelectOutlet(outlet: { id: string; name: string; code: string } | null) {
    if (outlet) {
      setStoredOutletContext({
        outletId: outlet.id,
        outletName: outlet.name,
        outletCode: outlet.code,
      });
    } else {
      setStoredOutletContext(null);
    }

    setIsOpen(false);

    // Invalidate queries so tasks, metrics, reports, and forms immediately refresh with new outlet
    void queryClient.invalidateQueries();
  }

  const isFiltered = Boolean(workspace.outletName || workspace.outletId);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${
            isFiltered
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/70"
              : "border-[#DDE8E1] bg-[#F7FAF8] text-[#274733] hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
          }`}
          title="Beralih Tinjauan Gerai"
          aria-expanded={isOpen}
        >
          <Store className={`size-3.5 ${isFiltered ? "text-emerald-700" : "text-[#3D6B49]"}`} />
          <span className="max-w-[130px] truncate sm:max-w-[180px]">
            {isFiltered ? (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                {workspace.outletName}
              </span>
            ) : (
              "Semua Gerai"
            )}
          </span>
          <ChevronDown
            className={`size-3.5 transition-transform ${isFiltered ? "text-emerald-700" : "text-[#3D6B49]"} ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isFiltered ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectOutlet(null);
            }}
            title="Kembali ke Semua Gerai"
            className="flex size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 z-50 w-72 origin-top-left rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          {outlets.length > 4 ? (
            <div className="relative mb-2 px-1">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama gerai..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>
          ) : null}

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {/* Opsi: Semua Gerai */}
            <button
              type="button"
              onClick={() => handleSelectOutlet(null)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                !isFiltered
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-slate-400" />
                <span>Semua Gerai (Command Center)</span>
              </div>
              {!isFiltered ? <Check className="size-3.5 text-emerald-700" /> : null}
            </button>

            {/* List Outlet */}
            {filteredOutlets.map((outlet) => {
              const isSelected =
                workspace.outletId === outlet.id || workspace.outletName === outlet.name;

              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => handleSelectOutlet(outlet)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-900 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{outlet.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{outlet.code}</p>
                  </div>
                  {isSelected ? <Check className="size-3.5 text-emerald-700 shrink-0" /> : null}
                </button>
              );
            })}

            {filteredOutlets.length === 0 && outlets.length > 0 && (
              <p className="py-4 text-center text-xs text-slate-400">Tidak ada gerai yang cocok.</p>
            )}

            {outlets.length === 0 && !outletsQuery.isLoading && (
              <div className="p-4 text-center text-xs text-slate-500">
                <Store className="mx-auto size-6 text-slate-300 mb-1" />
                <p className="font-semibold text-slate-700">Belum ada gerai terhubung</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Akun Area Manager ini belum memiliki gerai yang ditugaskan di pengaturan pengguna.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
