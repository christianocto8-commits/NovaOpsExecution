type LoadingStateProps = {
  rows?: number;
};

export function LoadingState({ rows = 5 }: LoadingStateProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-100" />

      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
