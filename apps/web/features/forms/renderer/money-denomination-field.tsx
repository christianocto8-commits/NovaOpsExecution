"use client";

import { FormField } from "@/features/forms/types";
import {
  formatIdr,
  getDenominations,
  parseMoneyDenomination,
  updateMoneyDenominationQty,
} from "@/features/forms/utils/money";

type MoneyDenominationFieldProps = {
  field: FormField;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

export function MoneyDenominationField({
  field,
  value,
  readOnly = false,
  onChange,
}: MoneyDenominationFieldProps) {
  const denominations = getDenominations(
    field.options as { denominations?: number[] } | undefined
  );
  const parsed = parseMoneyDenomination(value) ?? {
    counts: Object.fromEntries(denominations.map((denomination) => [String(denomination), 0])),
    total: 0,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <span>Denom</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Subtotal</span>
      </div>

      <div className="divide-y divide-slate-100">
        {denominations.map((denomination) => {
          const qty = parsed.counts[String(denomination)] ?? 0;
          const subtotal = qty * denomination;

          return (
            <div
              key={denomination}
              className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5"
            >
              <span className="text-sm font-semibold text-slate-800">{formatIdr(denomination)}</span>

              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={qty || ""}
                disabled={readOnly}
                onChange={(event) => {
                  const nextQty = event.target.value === "" ? 0 : Number(event.target.value);
                  const nextValue = updateMoneyDenominationQty(
                    value,
                    denomination,
                    nextQty,
                    denominations
                  );
                  const parsed = parseMoneyDenomination(nextValue);
                  onChange(parsed && parsed.total > 0 ? nextValue : "");
                }}
                placeholder="0"
                className="h-10 rounded-xl border border-slate-200 px-2 text-center text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
              />

              <span className="text-right text-sm font-semibold text-slate-700">
                {subtotal > 0 ? formatIdr(subtotal) : "-"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50 px-3 py-3">
        <span className="text-sm font-bold text-emerald-900">Total Setoran</span>
        <span className="text-base font-bold text-emerald-800">{formatIdr(parsed.total)}</span>
      </div>
    </div>
  );
}
