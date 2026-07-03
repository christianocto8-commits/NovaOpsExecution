import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: string;
};

export function Input({
  label,
  error,
  helper,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-medium text-[#1E1E1E]">
          {label}
        </span>
      ) : null}

      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-xl border border-[#D8E2DC] bg-white px-4 text-sm text-[#1E1E1E] outline-none transition placeholder:text-gray-400 focus:border-[#274733] focus:ring-4 focus:ring-[#EAF1EC]",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-50" : "",
          className
        )}
        {...props}
      />

      {error ? (
        <span className="mt-2 block text-xs font-medium text-red-600">
          {error}
        </span>
      ) : helper ? (
        <span className="mt-2 block text-xs text-gray-500">{helper}</span>
      ) : null}
    </label>
  );
}