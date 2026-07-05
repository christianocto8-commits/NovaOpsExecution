"use client";

import { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import { getMe, logout as logoutService, type AuthUser } from "@/services/auth.service";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  loading: boolean;
  isAuthenticated: boolean;
  restoreSession: () => Promise<AuthUser | null>;
  logout: () => void;
  can: (permission: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
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
      setStatus("authenticated");
      return currentUser;
    } catch {
      logoutService();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setUser(null);
    setStatus("unauthenticated");
    window.location.href = "/login";
  }, []);

  const can = useCallback((permission: string) => true, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      loading: status === "idle" || status === "loading",
      isAuthenticated: status === "authenticated",
      restoreSession,
      logout,
      can,
    }),
    [user, status, restoreSession, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
