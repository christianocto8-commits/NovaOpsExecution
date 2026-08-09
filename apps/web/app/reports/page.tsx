import { Suspense } from "react";

import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";
import { AuthGuard } from "@/lib/auth/auth-guard";

export default function ReportsPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-slate-500">
            Memuat laporan...
          </main>
        }
      >
        <ReportsWorkspace />
      </Suspense>
    </AuthGuard>
  );
}
