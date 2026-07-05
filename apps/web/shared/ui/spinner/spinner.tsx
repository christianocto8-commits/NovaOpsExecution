type SpinnerProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <span
      className={[
        "inline-block animate-spin rounded-full border-2 border-slate-200 border-t-emerald-700",
        sizeClass[size],
      ].join(" ")}
    />
  );
}
