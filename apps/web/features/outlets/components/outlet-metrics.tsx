type OutletMetricsProps = {
  total: number;
  online: number;
  review: number;
  offline: number;
};

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function OutletMetrics({ total, online, review, offline }: OutletMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Total Outlets"
        value={total}
        description="Registered operating locations"
      />
      <MetricCard label="Online" value={online} description="Operational outlets" />
      <MetricCard label="Need Review" value={review} description="Require operational validation" />
      <MetricCard label="Offline" value={offline} description="Temporarily inactive" />
    </div>
  );
}
