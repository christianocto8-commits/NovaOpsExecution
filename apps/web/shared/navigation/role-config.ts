export type NovaRole = "OWNER_ADMIN" | "AREA_MANAGER" | "OUTLET" | "FINANCE";

export type NavigationMode = "enterprise" | "area" | "outlet" | "finance";

export type CurrentWorkspace = {
  role: NovaRole;
  roleLabel: string;
  mode: NavigationMode;
  outletId?: string;
  outletName?: string;
  outletCode?: string;
  legacyOutletId?: number;
};

export const defaultWorkspace: CurrentWorkspace = {
  role: "OWNER_ADMIN",
  roleLabel: "Owner/Admin",
  mode: "enterprise",
};
