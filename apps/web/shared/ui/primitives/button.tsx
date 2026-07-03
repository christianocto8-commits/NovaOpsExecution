import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[#274733] text-white hover:bg-[#1F3929]",
  secondary: "bg-[#EAF1EC] text-[#274733] hover:bg-[#DDEBE1]",
  outline: "border border-[#D8E2DC] bg-white text-[#274733] hover:bg-[#F7FAF8]",
  ghost: "bg-transparent text-[#274733] hover:bg-[#F7FAF8]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {iconLeft ? <span className="shrink-0">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="shrink-0">{iconRight}</span> : null}
    </button>
  );
}