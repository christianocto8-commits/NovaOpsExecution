"use client";

import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AccessDenied";

/**
 * Wraps the app shell. When outlet-only mode is active (Android APK build) and
 * a non-outlet account authenticates, this renders the Access Denied screen
 * instead of the dashboard. Does nothing on the public web deployment.
 */
export function OutletOnlyGate({ children }: { children: React.ReactNode }) {
  const { deniedUser, logout } = useAuth();

  if (deniedUser) {
    return (
      <AccessDenied
        email={deniedUser.user.email}
        roleLabel={deniedUser.role.name}
        onLogout={logout}
      />
    );
  }

  return <>{children}</>;
}
