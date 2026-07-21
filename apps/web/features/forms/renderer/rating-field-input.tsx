"use client";

import { Star } from "lucide-react";

type RatingFieldInputProps = {
  value: string;
  maxStars?: number;
  lowLabel?: string;
  highLabel?: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

export function RatingFieldInput({
  value,
  maxStars = 5,
  lowLabel,
  highLabel,
  readOnly = false,
  onChange,
}: RatingFieldInputProps) {
  const stars = Math.max(1, Math.min(10, maxStars));
  const selected = Number.parseInt(value, 10);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: stars }, (_, index) => {
          const starValue = index + 1;
          const isActive = Number.isFinite(selected) && selected >= starValue;

          return (
            <button
              key={starValue}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(String(starValue))}
              className={`rounded-xl p-1 transition disabled:cursor-not-allowed ${
                isActive ? "text-amber-500" : "text-slate-300 hover:text-amber-300"
              }`}
              aria-label={`${starValue} bintang`}
            >
              <Star className={`size-8 ${isActive ? "fill-current" : ""}`} />
            </button>
          );
        })}
      </div>

      {lowLabel || highLabel ? (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{lowLabel ?? ""}</span>
          <span>{highLabel ?? ""}</span>
        </div>
      ) : null}
    </div>
  );
}
