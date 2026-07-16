"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
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

function getParentRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return "/dashboard";
  }

  if (segments.length === 2) {
    return "/dashboard";
  }

  return `/${segments.slice(0, -1).join("/")}`;
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

function MobileQuickActions({
  pathname,
  onOpenMenu,
}: {
  pathname: string;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const showBackButton = pathname !== "/dashboard";
  const parentRoute = getParentRoute(pathname);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[65] flex items-center justify-between gap-3 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-full bg-[#274733] px-4 text-sm font-semibold text-white shadow-lg"
      >
        <Menu className="size-4" />
        Menu
      </button>

      {showBackButton ? (
        <button
          type="button"
          onClick={() => router.push(parentRoute)}
          className="flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-full border border-[#DDE8E1] bg-white px-4 text-sm font-semibold text-[#274733] shadow-lg"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      ) : <div className="h-12 min-w-[112px]" />}
    </div>
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
    <div className="min-h-screen bg-[#F7FAF8] pb-20 lg:pb-0">
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

        {canAccess ? children : <AccessDenied />}
      </div>

      <MobileQuickActions
        pathname={pathname}
        onOpenMenu={() => setMobileSidebarOpen(true)}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
