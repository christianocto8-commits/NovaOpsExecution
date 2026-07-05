import { Suspense } from "react";

import { TasksWorkspace } from "@/features/tasks/components";

function TasksPageContent() {
  return <TasksWorkspace />;
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-slate-500">Loading tasks...</div>
        </main>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
