import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8E2DC] bg-[#F7FAF8] p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#274733] shadow-sm">
        —
      </div>

      <h3 className="mt-4 text-base font-semibold text-[#1E1E1E]">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}