"use client";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-7 w-72" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <Skeleton className="h-24 w-full" />
      <FormSkeleton />
    </div>
  );
}

export function TaskSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3 py-4 border-b border-slate-100 last:border-b-0 md:grid md:grid-cols-[1fr_160px_120px] md:gap-3 md:space-y-0">
          <div className="space-y-2">
            <div className="h-4 w-2/3 rounded-xl bg-slate-100" />
            <div className="h-3 w-1/3 rounded-xl bg-slate-50" />
          </div>
          <div className="flex gap-4 md:block space-y-1">
            <div className="h-3 w-12 rounded-xl bg-slate-50" />
            <div className="h-4 w-16 rounded-xl bg-slate-100" />
          </div>
          <div className="flex gap-4 md:block space-y-1">
            <div className="h-3 w-12 rounded-xl bg-slate-50" />
            <div className="h-4 w-16 rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
