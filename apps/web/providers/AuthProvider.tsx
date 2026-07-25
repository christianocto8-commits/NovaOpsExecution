"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { getSettings } from "@/features/settings/settings-api";
import { getMe, logout as logoutService, type AuthUser } from "@/services/auth.service";
import type { NovaRole } from "@/shared/navigation/role-config";
import { setStoredWorkspaceRole } from "@/shared/navigation/workspace-store";

const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
const LAST_ACTIVITY_KEY = "novaops_last_activity_at";
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;

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

function readLastActivity() {
  if (typeof window === "undefined") return Date.now();
  const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
}

function writeLastActivity() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

async function resolveIdleTimeoutMinutes() {
  try {
    const settings = await getSettings();
    const minutes = Number(settings.session_timeout_minutes);
    if (minutes === 15 || minutes === 30) {
      return minutes;
    }
  } catch {
    // Keep secure fallback when settings cannot be loaded.
  }

  return DEFAULT_IDLE_TIMEOUT_MINUTES;
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
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setStatus("unauthenticated");
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutMinutes = DEFAULT_IDLE_TIMEOUT_MINUTES;
    let lastWrite = 0;
    let cancelled = false;

    writeLastActivity();

    void resolveIdleTimeoutMinutes().then((minutes) => {
      if (!cancelled) {
        timeoutMinutes = minutes;
      }
    });

    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      writeLastActivity();
    };

    const intervalId = window.setInterval(() => {
      const idleMs = Date.now() - readLastActivity();
      if (idleMs >= timeoutMinutes * 60 * 1000) {
        logout();
      }
    }, 30000);

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [logout, status]);

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
