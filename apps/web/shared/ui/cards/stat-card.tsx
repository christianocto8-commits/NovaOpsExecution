import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: string;
  className?: string;
};

export function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-[#E7ECE9] bg-white p-6 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-[#274733]">{value}</div>
        </div>

        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1EC] text-[#274733]">
            {icon}
          </div>
        ) : null}
      </div>

      {description ? <p className="mt-3 text-xs text-gray-500">{description}</p> : null}

      {trend ? (
        <div className="mt-4 inline-flex rounded-full bg-[#EAF1EC] px-3 py-1 text-xs font-semibold text-[#274733]">
          {trend}
        </div>
      ) : null}
    </div>
  );
}
