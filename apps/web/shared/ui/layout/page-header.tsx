import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            {eyebrow}
          </div>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
