"use client";

import { useContext } from "react";
import { LogOut } from "lucide-react";
import { AuthContext } from "@/providers/AuthProvider";
import { useLanguage } from "@/shared/i18n";
import { CurrentWorkspace } from "../role-config";

type SidebarFooterProps = {
  collapsed: boolean;
  workspace: CurrentWorkspace;
};

export function SidebarFooter({ collapsed, workspace }: SidebarFooterProps) {
  const auth = useContext(AuthContext);
  const { t, language, setLanguage } = useLanguage();
  const title = workspace.mode === "outlet" ? (workspace.outletName ?? "Outlet") : "KOV Operations";

  const toggleLanguage = () => {
    setLanguage(language === "id" ? "en" : "id");
  };

  return (
    <div className="border-t border-[#DDE8E1] p-4">
      <div
        className={[
          "rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] transition-all",
          collapsed ? "p-3 text-center" : "p-4",
        ].join(" ")}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D6B49]">
          {collapsed ? "KOV" : workspace.roleLabel}
        </p>

        {!collapsed ? (
          <>
            <p className="mt-1 text-sm font-bold text-[#274733]">{title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {workspace.mode === "outlet" ? "Outlet mode active" : "Enterprise mode active"}
            </p>

            {/* Mobile / Sidebar Actions: Language & Logout */}
            <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#DDE8E1]/80 pt-3">
              <button
                type="button"
                onClick={toggleLanguage}
                title={language === "id" ? "Switch to English" : "Ubah ke Bahasa Indonesia"}
                className="inline-flex items-center gap-1 rounded-full border border-[#DDE8E1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#274733] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
              >
                <span className={language === "id" ? "text-[#274733] font-bold" : "text-gray-400 font-normal"}>
                  ID
                </span>
                <span className="text-gray-300">|</span>
                <span className={language === "en" ? "text-[#274733] font-bold" : "text-gray-400 font-normal"}>
                  EN
                </span>
              </button>

              <button
                type="button"
                onClick={() => auth?.logout()}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                <LogOut className="size-3.5" />
                <span>{t("common.logout")}</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
