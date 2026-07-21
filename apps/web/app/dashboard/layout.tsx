"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/lib/auth/auth-guard";
import {
  DashboardHeader,
  EnterpriseSidebar,
  canAccessPath,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { OperatorBottomNav } from "@/shared/navigation/components/operator-bottom-nav";
import { BrandThemeProvider } from "@/shared/branding/brand-theme-provider";

const SIDEBAR_STORAGE_KEY = "novaops_sidebar_collapsed";

function subscribeSidebarStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("novaops-sidebar-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("novaops-sidebar-change", callback);
  };
}

function getSidebarSnapshot() {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getServerSidebarSnapshot() {
  return false;
}

function AccessDenied() {
  return (
    <main className="p-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">Access Denied</p>
        <h1 className="mt-2 text-2xl font-semibold text-red-950">
          You do not have permission to access this page.
        </h1>
        <p className="mt-2 text-sm text-red-700">
          This route is restricted by NovaOps permission-based access control.
        </p>
      </div>
    </main>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const collapsed = useSyncExternalStore(
    subscribeSidebarStorage,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const canAccess = canAccessPath(can, pathname, workspace);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  function toggleSidebar() {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event("novaops-sidebar-change"));
  }

  return (
    <div className="min-h-screen bg-[#F7FAF8]">
      <EnterpriseSidebar
        collapsed={collapsed}
        workspace={workspace}
        mobileOpen={mobileSidebarOpen}
        onToggle={toggleSidebar}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div
        className={[
          "transition-all duration-300 ease-out",
          collapsed ? "lg:pl-24" : "lg:pl-72",
        ].join(" ")}
      >
        <DashboardHeader
          workspace={workspace}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
        />

        {canAccess ? (
          <div className={workspace.mode === "outlet" ? "pb-20 lg:pb-0" : undefined}>
            {children}
          </div>
        ) : (
          <AccessDenied />
        )}
      </div>

      {workspace.mode === "outlet" ? <OperatorBottomNav /> : null}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <BrandThemeProvider>
        <DashboardShell>{children}</DashboardShell>
      </BrandThemeProvider>
    </AuthGuard>
  );
}
