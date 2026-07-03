import { cn } from "@/lib/cn";

type DividerProps = {
  className?: string;
};

export function Divider({ className }: DividerProps) {
  return <div className={cn("h-px w-full bg-[#E7ECE9]", className)} />;
}