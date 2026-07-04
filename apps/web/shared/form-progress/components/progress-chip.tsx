"use client";

type ProgressChipProps = {
  percentage: number;
};

export function ProgressChip({ percentage }: ProgressChipProps) {
  const className =
    percentage >= 100
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : percentage >= 71
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : percentage >= 31
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {percentage}%
    </span>
  );
}
