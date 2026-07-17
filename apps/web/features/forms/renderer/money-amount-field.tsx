"use client";

import { formatIdr, parseDigits } from "@/features/forms/utils/money";

type MoneyAmountFieldProps = {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

export function MoneyAmountField({ value, readOnly = false, onChange }: MoneyAmountFieldProps) {
  const amount = parseDigits(value);

  return (
    <div className="space-y-2">
      <input
        type="text"
        inputMode="numeric"
        value={amount > 0 ? amount.toLocaleString("id-ID") : ""}
        disabled={readOnly}
        onChange={(event) => {
          const nextAmount = parseDigits(event.target.value);
          onChange(nextAmount > 0 ? String(nextAmount) : "");
        }}
        placeholder="0"
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
      />
      <p className="text-xs font-semibold text-slate-500">{formatIdr(amount)}</p>
    </div>
  );
}
