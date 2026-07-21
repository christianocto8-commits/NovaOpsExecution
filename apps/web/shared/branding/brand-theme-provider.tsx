"use client";

import { useEffect } from "react";

import { useSettings } from "@/features/settings/hooks/use-settings";

function normalizeHexColor(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed;
  }
  return "#047857";
}

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const primaryColor = normalizeHexColor(settings?.brand_primary_color);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", primaryColor);
    document.documentElement.style.setProperty("--brand-primary-dark", primaryColor);
  }, [primaryColor]);

  return children;
}

export function useBrandSettings() {
  const { settings } = useSettings();

  return {
    logoUrl: settings?.brand_logo_url?.trim() || null,
    primaryColor: normalizeHexColor(settings?.brand_primary_color),
    organizationName: settings?.organization_name ?? "NovaOps",
    workspaceName: settings?.workspace_name ?? "Enterprise",
  };
}
