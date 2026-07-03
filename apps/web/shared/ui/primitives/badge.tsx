import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "primary";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClass: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
  primary: "bg-[#EAF1EC] text-[#274733]",
};

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}