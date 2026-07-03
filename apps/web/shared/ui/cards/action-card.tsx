import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ActionCard({
  title,
  description,
  icon,
  action,
  className,
}: ActionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E7ECE9] bg-white p-5 shadow-sm transition hover:border-[#C9D8CF]",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1EC] text-[#274733]">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#1E1E1E]">{title}</h3>

          {description ? (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          ) : null}

          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}