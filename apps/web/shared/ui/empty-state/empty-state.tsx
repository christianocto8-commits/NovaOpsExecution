import { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>

      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}