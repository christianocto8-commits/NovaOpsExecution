import { cn } from "@/lib/cn";

type LoadingSkeletonProps = {
  className?: string;
};

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn("animate-pulse rounded-xl bg-[#EAF1EC]", className ?? "h-6 w-full")} />;
}
