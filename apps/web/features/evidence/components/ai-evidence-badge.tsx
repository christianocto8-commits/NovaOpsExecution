"use client";

import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

type AIEvidenceBadgeProps = {
  status?: "passed" | "flagged" | "review_needed" | string;
  confidenceScore?: number;
  compact?: boolean;
};

export function AIEvidenceBadge({
  status = "passed",
  confidenceScore = 95,
  compact = false,
}: AIEvidenceBadgeProps) {
  if (status === "flagged") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 font-bold text-red-700 ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
        }`}
      >
        <AlertTriangle className={compact ? "size-3" : "size-3.5"} />
        AI Flagged ({confidenceScore}%)
      </span>
    );
  }

  if (status === "review_needed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 font-bold text-amber-800 ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
        }`}
      >
        <AlertTriangle className={compact ? "size-3" : "size-3.5"} />
        Needs Review ({confidenceScore}%)
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-bold text-emerald-700 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <ShieldCheck className={compact ? "size-3" : "size-3.5"} />
      AI Verified ({confidenceScore}%)
    </span>
  );
}
