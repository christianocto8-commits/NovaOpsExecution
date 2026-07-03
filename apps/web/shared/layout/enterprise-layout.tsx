"use client";

import { ReactNode, useState } from "react";
import { EnterpriseSidebar } from "@/shared/layout/enterprise-sidebar";
import { EnterpriseTopbar } from "@/shared/layout/enterprise-topbar";

type EnterpriseLayoutProps = {
  children: ReactNode;
};

export function EnterpriseLayout({ children }: EnterpriseLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EnterpriseSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <EnterpriseTopbar />

        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}