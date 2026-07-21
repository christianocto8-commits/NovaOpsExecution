"use client";

import { ActivityFeed } from "@/features/activity/components/activity-feed";

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#274733]">Activity Feed</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semua pekerjaan yang terjadi di outlet — task, checklist, form, CAPA, pengumuman.
        </p>
      </div>
      <ActivityFeed limit={50} />
    </div>
  );
}
