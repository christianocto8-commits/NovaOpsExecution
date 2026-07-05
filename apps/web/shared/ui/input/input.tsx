import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      ) : null}

      <input
        {...props}
        className={[
          "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
            : "border-slate-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50",
          className,
        ].join(" ")}
      />

      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
