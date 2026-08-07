"use client";

import { ActivityFeed } from "@/features/activity/components/activity-feed";

export default function ActivityPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Monitoring</p>
        <h1 className="text-2xl font-semibold text-slate-950">Activity Feed</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Semua pekerjaan yang terjadi di outlet — task, checklist, form, CAPA, pengumuman.
        </p>
      </div>
      <ActivityFeed limit={50} />
    </main>
  );
}
