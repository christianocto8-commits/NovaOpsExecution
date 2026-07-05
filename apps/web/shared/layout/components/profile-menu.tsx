"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import {
  ChevronDown,
  HelpCircle,
  Keyboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";
import { usePopup } from "@/shared/popup";

const POPUP_ID = "profile-menu";

export function ProfileMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isPopupOpen, togglePopup, closePopup } = usePopup();

  const open = isPopupOpen(POPUP_ID);

  const closeMenu = useCallback(() => {
    closePopup(POPUP_ID);
  }, [closePopup]);

  useClickOutside(menuRef, closeMenu, { enabled: open });
  useEscapeKey(closeMenu, open);

  function handleLogout() {
    localStorage.removeItem("novaops_token");
    router.push("/login");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => togglePopup(POPUP_ID)}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
          A
        </div>

        <div className="hidden leading-tight md:block">
          <div className="text-sm font-bold text-slate-900">Admin NovaOps</div>
          <div className="text-xs font-medium text-slate-500">Super Admin</div>
        </div>

        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-base font-black text-emerald-700">
                A
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-950">Admin NovaOps</div>
                <div className="truncate text-xs text-slate-500">admin@novaops.com</div>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Super Admin
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={closeMenu}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <User className="h-4 w-4 text-slate-400" />
              Profile
            </button>

            <button
              onClick={closeMenu}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Preferences
            </button>

            <button
              onClick={closeMenu}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Keyboard className="h-4 w-4 text-slate-400" />
              Keyboard Shortcuts
            </button>

            <button
              onClick={closeMenu}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              Help Center
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-5 py-4 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
