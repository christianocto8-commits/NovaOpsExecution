import { SearchX } from "lucide-react";

export function CommandEmpty() {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <SearchX className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">No command found</p>

      <p className="mt-1 text-xs text-slate-500">
        Try reports, tasks, drafts, outlets, users, or settings.
      </p>
    </div>
  );
}
