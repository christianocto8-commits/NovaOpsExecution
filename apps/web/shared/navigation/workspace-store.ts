"use client";

import { CurrentWorkspace, NovaRole } from "./role-config";

const WORKSPACE_STORAGE_KEY = "novaops_workspace_role";

const workspaceMap: Record<NovaRole, CurrentWorkspace> = {
  OWNER_ADMIN: {
    role: "OWNER_ADMIN",
    roleLabel: "Owner/Admin",
    mode: "enterprise",
  },
  AREA_MANAGER: {
    role: "AREA_MANAGER",
    roleLabel: "Area Manager",
    mode: "area",
  },
  OUTLET: {
    role: "OUTLET",
    roleLabel: "Outlet",
    mode: "outlet",
    outletName: "KOV Heritage",
  },
};

export function getStoredWorkspace(): CurrentWorkspace {
  if (typeof window === "undefined") {
    return workspaceMap.OWNER_ADMIN;
  }

  const storedRole = localStorage.getItem(WORKSPACE_STORAGE_KEY) as NovaRole | null;

  if (!storedRole || !workspaceMap[storedRole]) {
    return workspaceMap.OWNER_ADMIN;
  }

  return workspaceMap[storedRole];
}

export function setStoredWorkspaceRole(role: NovaRole) {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, role);
  window.dispatchEvent(new Event("novaops-workspace-change"));
}

export function subscribeWorkspace(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("novaops-workspace-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("novaops-workspace-change", callback);
  };
}

export function getWorkspaceSnapshot() {
  return getStoredWorkspace();
}

export function getServerWorkspaceSnapshot() {
  return workspaceMap.OWNER_ADMIN;
}

export const workspaceOptions = Object.values(workspaceMap);
