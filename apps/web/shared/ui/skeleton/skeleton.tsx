type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-100",
        className,
      ].join(" ")}
    />
  );
}