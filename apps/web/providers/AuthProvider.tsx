"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { getMe, logout as logoutService, type AuthUser } from "@/services/auth.service";
import type { NovaRole } from "@/shared/navigation/role-config";
import { setStoredWorkspaceRole } from "@/shared/navigation/workspace-store";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  loading: boolean;
  isAuthenticated: boolean;
  restoreSession: () => Promise<AuthUser | null>;
  logout: () => void;
  can: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

function hasPermission(permissions: string[], permission: string) {
  if (permissions.includes(permission)) return true;

  const [resource] = permission.split(".");
  return permissions.includes(`${resource}.*`);
}

function getWorkspaceRoleFromSlug(roleSlug: string): NovaRole {
  if (roleSlug === "area_manager") return "AREA_MANAGER";
  if (roleSlug === "outlet") return "OUTLET";
  return "OWNER_ADMIN";
}

function getWorkspaceOutletContext(currentUser: AuthUser) {
  const preferredOutlet = currentUser.outlet_access.outlets?.[0];

  return {
    outletId:
      currentUser.outlet_access.outlet_id ??
      currentUser.outlet_access.outlet_ids?.[0] ??
      preferredOutlet?.id,
    outletName: currentUser.outlet_access.outlet_name ?? preferredOutlet?.name,
    outletCode: currentUser.outlet_access.outlet_code ?? preferredOutlet?.code,
    legacyOutletId: currentUser.outlet_access.legacy_outlet_id ?? undefined,
  };
}

function storeOutletApiContext(currentUser: AuthUser) {
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");

  if (currentUser.outlet_access.scope !== "single") return;

  const outletId =
    currentUser.outlet_access.legacy_outlet_id != null
      ? String(currentUser.outlet_access.legacy_outlet_id)
      : currentUser.outlet_access.outlet_id ??
        currentUser.outlet_access.outlet_ids?.[0] ??
        currentUser.outlet_access.outlets?.[0]?.id;

  if (outletId) {
    localStorage.setItem("novaops_outlet_id", outletId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  const restoreSession = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    setStatus("loading");

    try {
      const currentUser = await getMe();
      setUser(currentUser);
      storeOutletApiContext(currentUser);
      setStoredWorkspaceRole(
        getWorkspaceRoleFromSlug(currentUser.role.slug),
        getWorkspaceOutletContext(currentUser)
      );
      setStatus("authenticated");
      return currentUser;
    } catch {
      logoutService();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    if (status === "idle") {
      void restoreSession();
    }
  }, [status, restoreSession]);

  const logout = useCallback(() => {
    logoutService();
    setUser(null);
    setStatus("unauthenticated");
    window.location.href = "/login";
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      return hasPermission(user.permissions, permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.role.slug);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      loading: status === "idle" || status === "loading",
      isAuthenticated: status === "authenticated",
      restoreSession,
      logout,
      can,
      hasRole,
    }),
    [user, status, restoreSession, logout, can, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
