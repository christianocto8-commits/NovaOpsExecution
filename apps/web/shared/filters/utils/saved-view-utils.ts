import {
  EnterpriseFilterState,
  EnterpriseSavedView,
} from "../types";

export function createSavedViewId() {
  return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSavedView({
  name,
  filters,
  isDefault = false,
}: {
  name: string;
  filters: EnterpriseFilterState;
  isDefault?: boolean;
}): EnterpriseSavedView {
  const now = new Date().toISOString();

  return {
    id: createSavedViewId(),
    name,
    filters,
    createdAt: now,
    updatedAt: now,
    isDefault,
  };
}

export function serializeSavedViews(views: EnterpriseSavedView[]) {
  return JSON.stringify(views);
}

export function parseSavedViews(value: string | null): EnterpriseSavedView[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.filters === "object"
    );
  } catch {
    return [];
  }
}
