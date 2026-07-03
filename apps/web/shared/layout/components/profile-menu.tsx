"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("novaops_token");
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
          A
        </div>

        <div className="hidden leading-tight md:block">
          <div className="text-sm font-semibold text-slate-800">Admin NovaOps</div>
          <div className="text-xs text-slate-500">Owner</div>
        </div>

        <span className="text-xs text-slate-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="text-sm font-bold text-slate-900">Admin NovaOps</div>
            <div className="text-xs text-slate-500">admin@novaops.com</div>
          </div>

          <div className="p-2">
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
              Profile
            </button>
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
              Preferences
            </button>
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
              Help Center
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}