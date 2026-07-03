"use client";

import { createContext, useEffect, useState } from "react";
import {
  getMe,
  logout as logoutService,
  type AuthUser,
} from "@/services/auth.service";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  restoreSession: () => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function restoreSession() {
    try {
      const token = localStorage.getItem("novaops_token");

      if (!token) {
        setUser(null);
        return;
      }

      const currentUser = await getMe();
      setUser(currentUser);
    } catch {
      logoutService();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutService();
    setUser(null);
    window.location.href = "/login";
  }

  function can(permission: string) {
    return user?.permissions?.includes(permission) ?? false;
  }

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        restoreSession,
        logout,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}