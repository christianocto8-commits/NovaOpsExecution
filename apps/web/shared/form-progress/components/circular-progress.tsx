"use client";

type CircularProgressProps = {
  percentage: number;
  size?: number;
};

export function CircularProgress({ percentage, size = 44 }: CircularProgressProps) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none stroke-emerald-600 transition-all duration-500"
        />
      </svg>

      <span className="absolute text-[10px] font-semibold text-slate-700">{percentage}%</span>
    </div>
  );
}
