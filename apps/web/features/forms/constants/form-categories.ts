export type FormCategoryId =
  | "opening"
  | "closing"
  | "food_safety"
  | "cleaning"
  | "audit"
  | "finance"
  | "inventory"
  | "maintenance"
  | "quality_check"
  | "corrective_action"
  | "uncategorized";

export type FormCategory = {
  id: FormCategoryId;
  label: string;
  description: string;
};

/** Zenput-style operational categories (company folder labels). */
export const ZENPUT_FORM_CATEGORIES: FormCategory[] = [
  {
    id: "opening",
    label: "Opening",
    description: "Daily store opening procedures",
  },
  {
    id: "closing",
    label: "Closing",
    description: "End-of-day closing and cash control",
  },
  {
    id: "food_safety",
    label: "Food Safety",
    description: "Temperature logs and public health compliance",
  },
  {
    id: "cleaning",
    label: "Cleaning & Sanitation",
    description: "Cleaning, hygiene, and sanitation tasks",
  },
  {
    id: "audit",
    label: "Audit",
    description: "Compliance audits and line checks",
  },
  {
    id: "finance",
    label: "Finance",
    description: "Cash control, shift deposit, and finance audit forms",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock counts and inventory control",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Equipment and facility maintenance",
  },
  {
    id: "quality_check",
    label: "Quality Check",
    description: "Product and brand quality standards",
  },
  {
    id: "corrective_action",
    label: "Corrective Action",
    description: "Follow-up tasks from failed checks",
  },
  {
    id: "uncategorized",
    label: "Uncategorized",
    description: "Forms not yet assigned to a category",
  },
];

const LEGACY_CATEGORY_MAP: Record<string, FormCategoryId> = {
  Daily: "uncategorized",
  Checklist: "audit",
  Audit: "audit",
  Finance: "finance",
  "Finance Reports": "finance",
  "Audit Finance": "finance",
  Cleaning: "cleaning",
  "Cleaning Audit": "audit",
  Opening: "opening",
  Closing: "closing",
  Inventory: "inventory",
  "Quality Check": "quality_check",
  Maintenance: "maintenance",
  Custom: "uncategorized",
  draft: "uncategorized",
  opening: "opening",
  closing: "closing",
  food_safety: "food_safety",
  cleaning: "cleaning",
  audit: "audit",
  finance: "finance",
  finance_shift_deposit: "finance",
  inventory: "inventory",
  maintenance: "maintenance",
  quality_check: "quality_check",
  corrective_action: "corrective_action",
  uncategorized: "uncategorized",
};

export function normalizeFormCategoryId(value: string | undefined | null): FormCategoryId {
  if (!value?.trim()) {
    return "uncategorized";
  }

  const trimmed = value.trim();

  if (LEGACY_CATEGORY_MAP[trimmed]) {
    return LEGACY_CATEGORY_MAP[trimmed];
  }

  const byId = ZENPUT_FORM_CATEGORIES.find((category) => category.id === trimmed);
  if (byId) {
    return byId.id;
  }

  const byLabel = ZENPUT_FORM_CATEGORIES.find(
    (category) => category.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (byLabel) {
    return byLabel.id;
  }

  return "uncategorized";
}

export function getFormCategoryLabel(value: string | undefined | null): string {
  const id = normalizeFormCategoryId(value);
  return ZENPUT_FORM_CATEGORIES.find((category) => category.id === id)?.label ?? "Uncategorized";
}

export function getFormCategoryDescription(value: string | undefined | null): string {
  const id = normalizeFormCategoryId(value);
  return (
    ZENPUT_FORM_CATEGORIES.find((category) => category.id === id)?.description ??
    "Forms not yet assigned to a category"
  );
}
