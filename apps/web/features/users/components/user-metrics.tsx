type UserMetricsProps = {
  total: number;
  active: number;
  pending: number;
  suspended: number;
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

export function UserMetrics({ total, active, pending, suspended }: UserMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard label="Total Users" value={total} description="Registered enterprise users" />
      <MetricCard label="Active Users" value={active} description="Enabled accounts" />
      <MetricCard label="Pending Invites" value={pending} description="Waiting for activation" />
      <MetricCard label="Suspended" value={suspended} description="Restricted access" />
    </div>
  );
}
