export type NovaRole = "OWNER_ADMIN" | "AREA_MANAGER" | "OUTLET";

export type NavigationMode = "enterprise" | "area" | "outlet";

export type CurrentWorkspace = {
  role: NovaRole;
  roleLabel: string;
  mode: NavigationMode;
  outletId?: string;
  outletName?: string;
  outletCode?: string;
};

export const defaultWorkspace: CurrentWorkspace = {
  role: "OWNER_ADMIN",
  roleLabel: "Owner/Admin",
  mode: "enterprise",
};
