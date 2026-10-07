"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Search, Store } from "lucide-react";
import { getIdentityOutlets, type IdentityOutlet } from "@/services/identity.service";
import { setStoredOutletContext } from "../workspace-store";
import type { CurrentWorkspace } from "../role-config";

type OutletQuickSwitcherProps = {
  workspace: CurrentWorkspace;
};

export function OutletQuickSwitcher({ workspace }: OutletQuickSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const outletsQuery = useQuery({
    queryKey: ["identity-outlets"],
    queryFn: getIdentityOutlets,
    staleTime: 5 * 60 * 1000,
  });

  const outlets = outletsQuery.data ?? [];

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

  const filteredOutlets = outlets.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.code.toLowerCase().includes(search.toLowerCase())
  );

  const currentOutletLabel = workspace.outletName || "Semua Gerai";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-[#DDE8E1] bg-[#F7FAF8] px-3 py-1.5 text-xs font-bold text-[#274733] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC] active:scale-95"
        title="Beralih Tinjauan Gerai"
        aria-expanded={isOpen}
      >
        <Store className="size-3.5 text-[#3D6B49]" />
        <span className="max-w-[130px] truncate sm:max-w-[180px]">
          {workspace.outletName ? (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {workspace.outletName}
            </span>
          ) : (
            "Semua Gerai"
          )}
        </span>
        <ChevronDown className={`size-3.5 text-[#3D6B49] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 mt-2 z-50 w-72 origin-top-left rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
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
              onClick={() => {
                setStoredOutletContext(null);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                !workspace.outletName
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-slate-400" />
                <span>Semua Gerai (Command Center)</span>
              </div>
              {!workspace.outletName ? <Check className="size-3.5 text-emerald-700" /> : null}
            </button>

            {/* List Outlet */}
            {filteredOutlets.map((outlet) => {
              const isSelected =
                workspace.outletId === outlet.id || workspace.outletName === outlet.name;

              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => {
                    setStoredOutletContext({
                      outletId: outlet.id,
                      outletName: outlet.name,
                      outletCode: outlet.code,
                    });
                    setIsOpen(false);
                  }}
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

            {filteredOutlets.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">Tidak ada gerai ditemukan.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
