"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useBrandSettings } from "@/shared/branding/brand-theme-provider";

type SidebarBrandProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function SidebarBrand({ collapsed, onToggle }: SidebarBrandProps) {
  const { logoUrl, organizationName, workspaceName } = useBrandSettings();

  return (
    <div className="border-b border-[#DDE8E1] px-4 py-5">
      <div
        className={[
          "rounded-3xl text-white shadow-sm transition-all duration-300",
          collapsed ? "p-3" : "p-5",
        ].join(" ")}
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className={collapsed ? "sr-only" : "min-w-0 flex-1"}>
            {logoUrl ? (
              <div className="mb-3 overflow-hidden rounded-2xl bg-white/10 p-2">
                <Image
                  src={logoUrl}
                  alt={organizationName}
                  width={160}
                  height={48}
                  unoptimized
                  className="h-10 w-auto max-w-full object-contain"
                />
              </div>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {organizationName}
              </p>
            )}
            <h1 className="mt-2 truncate text-xl font-bold">{workspaceName}</h1>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed ? (
          <p className="mt-2 text-xs leading-5 text-white/80">
            Multi-outlet operations command center.
          </p>
        ) : null}
      </div>
    </div>
  );
}
