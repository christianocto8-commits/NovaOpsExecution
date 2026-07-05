import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("rounded-2xl border border-[#E7ECE9] bg-white shadow-sm", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col justify-between gap-3 border-b border-[#E7ECE9] px-6 py-5 sm:flex-row sm:items-start">
          <div>
            {title ? <h2 className="text-lg font-semibold text-[#1E1E1E]">{title}</h2> : null}

            {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
          </div>

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}

      <div className="p-6">{children}</div>
    </section>
  );
}
