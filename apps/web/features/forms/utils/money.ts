export const DEFAULT_IDR_DENOMINATIONS = [
  100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 200, 100,
];

export type MoneyDenominationValue = {
  counts: Record<string, number>;
  total: number;
};

export function formatIdr(amount: number) {
  if (!Number.isFinite(amount)) return "Rp 0";

  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export function parseDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function getDenominations(options?: { denominations?: number[] }) {
  const denominations = options?.denominations?.filter((value) => value > 0) ?? [];

  return denominations.length > 0 ? denominations : DEFAULT_IDR_DENOMINATIONS;
}

export function createEmptyMoneyDenomination(denominations: number[]): MoneyDenominationValue {
  const counts = Object.fromEntries(denominations.map((denomination) => [String(denomination), 0]));

  return { counts, total: 0 };
}

export function computeDenominationTotal(counts: Record<string, number>, denominations: number[]) {
  return denominations.reduce((total, denomination) => {
    const qty = counts[String(denomination)] ?? 0;
    return total + qty * denomination;
  }, 0);
}

export function parseMoneyDenomination(raw: string): MoneyDenominationValue | null {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<MoneyDenominationValue>;

    if (!parsed || typeof parsed !== "object" || !parsed.counts) return null;

    const counts = Object.fromEntries(
      Object.entries(parsed.counts).map(([key, value]) => [key, Number(value) || 0])
    );

    return {
      counts,
      total:
        typeof parsed.total === "number"
          ? parsed.total
          : computeDenominationTotal(counts, getDenominations()),
    };
  } catch {
    return null;
  }
}

export function serializeMoneyDenomination(value: MoneyDenominationValue) {
  return JSON.stringify(value);
}

export function updateMoneyDenominationQty(
  raw: string,
  denomination: number,
  qty: number,
  denominations: number[]
) {
  const current = parseMoneyDenomination(raw) ?? createEmptyMoneyDenomination(denominations);
  const nextCounts = {
    ...current.counts,
    [String(denomination)]: Math.max(0, qty),
  };

  return serializeMoneyDenomination({
    counts: nextCounts,
    total: computeDenominationTotal(nextCounts, denominations),
  });
}

export function isMoneyDenominationFilled(raw: string) {
  const parsed = parseMoneyDenomination(raw);
  return Boolean(parsed && parsed.total > 0);
}

export function isMoneyAmountFilled(raw: string) {
  return parseDigits(raw) > 0;
}
