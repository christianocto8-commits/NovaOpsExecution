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
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-[#E7ECE9] bg-white shadow-sm",
        className
      )}
    >
      {(title || description || actions) && (
        <div className="flex min-w-0 flex-col justify-between gap-3 border-b border-[#E7ECE9] px-4 py-4 sm:flex-row sm:items-start sm:px-6 sm:py-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="break-words text-base font-semibold text-[#1E1E1E] sm:text-lg">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 break-words text-sm leading-5 text-gray-500">{description}</p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}

      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </section>
  );
}
