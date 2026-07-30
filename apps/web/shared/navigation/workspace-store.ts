"use client";

import { CurrentWorkspace, NovaRole } from "./role-config";

const WORKSPACE_STORAGE_KEY = "novaops_workspace_role";
const WORKSPACE_CONTEXT_KEY = "novaops_workspace_context";

type StoredWorkspaceContext = {
  outletId?: string;
  outletName?: string;
  outletCode?: string;
  legacyOutletId?: number;
};

let cachedSnapshotKey = "";
let cachedSnapshot: CurrentWorkspace | null = null;

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
  },
  FINANCE: {
    role: "FINANCE",
    roleLabel: "Finance",
    mode: "finance",
  },
};

function getStoredWorkspaceContext(): StoredWorkspaceContext {
  if (typeof window === "undefined") return {};

  try {
    const storedContext = localStorage.getItem(WORKSPACE_CONTEXT_KEY);
    if (!storedContext) return {};

    const parsed = JSON.parse(storedContext) as StoredWorkspaceContext;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getStoredWorkspace(): CurrentWorkspace {
  if (typeof window === "undefined") {
    return workspaceMap.OWNER_ADMIN;
  }

  const storedRole = localStorage.getItem(WORKSPACE_STORAGE_KEY) as NovaRole | null;
  const storedContext = localStorage.getItem(WORKSPACE_CONTEXT_KEY) ?? "";
  const snapshotKey = `${storedRole ?? ""}:${storedContext}`;

  if (cachedSnapshot && cachedSnapshotKey === snapshotKey) {
    return cachedSnapshot;
  }

  if (!storedRole || !workspaceMap[storedRole]) {
    cachedSnapshotKey = snapshotKey;
    cachedSnapshot = workspaceMap.OWNER_ADMIN;
    return cachedSnapshot;
  }

  cachedSnapshotKey = snapshotKey;
  cachedSnapshot = {
    ...workspaceMap[storedRole],
    ...getStoredWorkspaceContext(),
  };

  return cachedSnapshot;
}

export function setStoredWorkspaceRole(role: NovaRole, context: StoredWorkspaceContext = {}) {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, role);

  if (role === "OUTLET" || role === "AREA_MANAGER" || role === "FINANCE") {
    localStorage.setItem(WORKSPACE_CONTEXT_KEY, JSON.stringify(context));
  } else {
    localStorage.removeItem(WORKSPACE_CONTEXT_KEY);
  }

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
