import { DraftStatus } from "../types";

const statusMap: Record<DraftStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  ready: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusMap[status]}`}
    >
      {status}
    </span>
  );
}