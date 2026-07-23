"use client";

type FormProgressBarProps = {
  percentage: number;
  completed: number;
  total: number;
  variant?: "default" | "compact";
  className?: string;
};

export function FormProgressBar({
  percentage,
  completed,
  total,
  variant = "default",
  className = "",
}: FormProgressBarProps) {
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`.trim()}>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
          {completed}/{total}
          <span className="ml-1 text-emerald-700">{percentage}%</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Form Progress</p>
          <p className="mt-1 text-xs text-slate-500">
            {completed} of {total} required fields completed
          </p>
        </div>

        <div className="text-sm font-semibold text-emerald-700">{percentage}%</div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
