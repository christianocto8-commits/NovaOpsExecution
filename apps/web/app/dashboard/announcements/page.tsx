"use client";

import { AnnouncementsPanel } from "@/features/announcements/components/announcements-panel";

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#274733]">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola broadcast pengumuman untuk crew outlet.
        </p>
      </div>
      <AnnouncementsPanel />
    </div>
  );
}
