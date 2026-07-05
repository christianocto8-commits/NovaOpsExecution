"use client";

import { CommandTrigger } from "@/shared/command-center";
import { Breadcrumb } from "@/shared/layout/components/breadcrumb";
import { NotificationMenu } from "@/shared/layout/components/notification-menu";
import { ProfileMenu } from "@/shared/layout/components/profile-menu";

export function EnterpriseTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Workspace</div>

        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <CommandTrigger />

        <button
          type="button"
          className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 md:block"
        >
          ?
        </button>

        <NotificationMenu />

        <ProfileMenu />
      </div>
    </header>
  );
}
