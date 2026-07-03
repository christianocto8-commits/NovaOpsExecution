import { ReactNode } from "react";

type ModulePlaceholderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function ModulePlaceholder({
  title,
  description,
  children,
}: ModulePlaceholderProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-bold text-emerald-700">
        {title.slice(0, 1)}
      </div>

      <h3 className="text-lg font-bold text-slate-950">{title}</h3>

      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}