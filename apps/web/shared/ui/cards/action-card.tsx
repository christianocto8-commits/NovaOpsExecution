import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ActionCard({ title, description, icon, action, className }: ActionCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-[#E7ECE9] bg-white p-4 shadow-sm transition hover:border-[#C9D8CF] sm:p-5",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1EC] text-[#274733]">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-[#1E1E1E]">{title}</h3>

          {description ? <p className="mt-1 break-words text-sm leading-5 text-gray-500">{description}</p> : null}

          {action ? <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
