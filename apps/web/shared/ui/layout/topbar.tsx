"use client";

import { Avatar } from "@/shared/ui/primitives";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E7ECE9] bg-white/90 px-6 backdrop-blur">
      <div>
        <div className="text-sm font-semibold text-[#274733]">
          Operations Workspace
        </div>
        <div className="text-xs text-gray-500">
          Manage outlets, tasks, reports, and workflows
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-gray-900">Admin NovaOps</div>
          <div className="text-xs text-gray-500">Owner</div>
        </div>

        <Avatar name="Admin NovaOps" />
      </div>
    </header>
  );
}