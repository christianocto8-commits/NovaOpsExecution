import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Section } from "@/shared/ui";

type TaskMetricsProps = {
  open: number;
  completed: number;
  overdue: number;
};

export function TaskMetrics({ open, completed, overdue }: TaskMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Open Tasks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{open}</p>
          </div>
          <Clock className="h-5 w-5 text-amber-500" />
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {completed}
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Overdue</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {overdue}
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
      </Section>
    </div>
  );
}
