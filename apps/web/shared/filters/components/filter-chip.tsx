"use client";

type FilterChipProps = {
  label: string;
  value: string;
  onRemove: () => void;
};

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
    >
      <span>
        {label}: {value}
      </span>
      <span className="text-emerald-500">×</span>
    </button>
  );
}