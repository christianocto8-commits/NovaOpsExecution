type StatusVariant =
  "success" | "warning" | "danger" | "info" | "neutral" | "draft" | "active" | "inactive";

type StatusBadgeProps = {
  label: string;
  variant?: StatusVariant;
};

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  neutral: "bg-slate-50 text-slate-600 ring-slate-200",
  draft: "bg-violet-50 text-violet-700 ring-violet-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-50 text-slate-500 ring-slate-200",
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
