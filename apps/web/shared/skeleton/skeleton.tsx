"use client";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-100 ${className}`}
    />
  );
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
