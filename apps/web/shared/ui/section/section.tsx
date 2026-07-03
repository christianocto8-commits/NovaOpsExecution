import { ReactNode } from "react";

type SectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Section({
  title,
  description,
  actions,
  children,
}: SectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {title || description || actions ? (
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-slate-950">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>

          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}