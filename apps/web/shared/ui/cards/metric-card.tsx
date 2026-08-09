import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  status?: "success" | "warning" | "danger" | "neutral";
  className?: string;
};

const statusMap = {
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-gray-50 text-gray-700",
};

export function MetricCard({
  label,
  value,
  helper,
  status = "neutral",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-[#E7ECE9] bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="break-words text-sm font-medium text-gray-500">{label}</div>

      <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-2 sm:gap-4">
        <div className="min-w-0 break-words text-xl font-bold text-[#1E1E1E] sm:text-2xl">
          {value}
        </div>

        <span
          className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", statusMap[status])}
        >
          {status}
        </span>
      </div>

      {helper ? <p className="mt-3 break-words text-xs leading-5 text-gray-500">{helper}</p> : null}
    </div>
  );
}
