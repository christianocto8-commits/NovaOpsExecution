import { AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again or contact your administrator.",
  action,
}: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-white text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-red-900">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{description}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
