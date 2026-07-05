"use client";

type FormProgressBarProps = {
  percentage: number;
  completed: number;
  total: number;
};

export function FormProgressBar({ percentage, completed, total }: FormProgressBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
