import { Suspense } from "react";

import { TasksWorkspace } from "@/features/tasks/components";

function DashboardTasksPageContent() {
  return <TasksWorkspace />;
}

export default function DashboardTasksPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-slate-500">Loading tasks...</div>
        </main>
      }
    >
      <DashboardTasksPageContent />
    </Suspense>
  );
}
