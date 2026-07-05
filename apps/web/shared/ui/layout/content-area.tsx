import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <section
      className={cn("rounded-2xl border border-[#E7ECE9] bg-white p-6 shadow-sm", className)}
    >
      {children}
    </section>
  );
}
