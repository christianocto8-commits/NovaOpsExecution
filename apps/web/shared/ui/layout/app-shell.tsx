"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F7FAF8]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />

          <main className="flex-1 px-6 py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}