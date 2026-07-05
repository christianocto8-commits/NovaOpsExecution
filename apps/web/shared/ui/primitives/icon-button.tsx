import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClass: Record<IconButtonVariant, string> = {
  primary: "bg-[#274733] text-white hover:bg-[#1F3929]",
  secondary: "bg-[#EAF1EC] text-[#274733] hover:bg-[#DDEBE1]",
  outline: "border border-[#D8E2DC] bg-white text-[#274733] hover:bg-[#F7FAF8]",
  ghost: "bg-transparent text-[#274733] hover:bg-[#F7FAF8]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-11 w-11",
};

export function IconButton({
  icon,
  label,
  className,
  variant = "ghost",
  size = "md",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
