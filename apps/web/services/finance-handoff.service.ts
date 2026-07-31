import { api } from "@/services/api";

export type FinanceShiftDeposit = {
  id: string;
  form_submission_id?: number | null;
  outlet_id: string | null;
  outlet_name: string | null;
  business_date: string;
  shift_name: string;
  department: string;
  cashier_name: string | null;
  cash_sales: number;
  qris_sales: number;
  edc_sales: number;
  expected_cash: number;
  actual_cash: number;
  deposit_amount: number;
  variance_amount: number;
  variance_reason: string | null;
  evidence_urls: string[];
  status: string;
  finance_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  corrective_task_id: number | null;
  submitted_by: string | null;
  submitted_at: string;
};

export type FinanceShiftDepositPayload = Omit<
  FinanceShiftDeposit,
  | "id"
  | "variance_amount"
  | "status"
  | "finance_note"
  | "reviewed_by"
  | "reviewed_at"
  | "corrective_task_id"
  | "submitted_by"
  | "submitted_at"
>;

export type FinanceSummary = {
  pending_review: number;
  approved: number;
  rejected: number;
  correction_requested: number;
  total_deposit_amount: number;
  total_variance_amount: number;
  discrepancy_count: number;
  discrepancy_threshold: number;
};

export function listFinanceDeposits() {
  return api<FinanceShiftDeposit[]>("/api/v1/finance-handoff/deposits");
}

export function createFinanceDeposit(payload: FinanceShiftDepositPayload) {
  return api<FinanceShiftDeposit>("/api/v1/finance-handoff/deposits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function reviewFinanceDeposit(id: string, status: string, finance_note?: string | null) {
  return api<FinanceShiftDeposit>(`/api/v1/finance-handoff/deposits/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status, finance_note: finance_note ?? null }),
  });
}

export function getFinanceSummary() {
  return api<FinanceSummary>("/api/v1/finance-handoff/summary");
}

export function ensureFinanceShiftTemplate() {
  return api<{ template_id: number; title: string; form_type: string }>(
    "/api/v1/finance-handoff/ensure-shift-template",
    { method: "POST" }
  );
}
