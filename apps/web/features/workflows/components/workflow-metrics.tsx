type WorkflowMetricsProps = {
  total: number;
  active: number;
  draft: number;
  inactive: number;
};

export function WorkflowMetrics({ total, active, draft, inactive }: WorkflowMetricsProps) {
  const items = [
    { label: "Total Workflows", value: total, tone: "text-slate-950" },
    { label: "Active", value: active, tone: "text-emerald-700" },
    { label: "Draft", value: draft, tone: "text-amber-700" },
    { label: "Inactive / Archived", value: inactive, tone: "text-slate-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
