export default function HistoryPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">
          Outlet Operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Task History
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Review completed outlet tasks, submitted evidence, operators, and audit timestamps.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">
          History workspace foundation ready.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          This page will be connected to task execution logs in the next sprint.
        </p>
      </div>
    </main>
  );
}
