"use client";

import { ReactNode } from "react";

import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";
import { AuthProvider } from "@/providers/AuthProvider";
import { OfflineSyncProvider } from "@/providers/OfflineSyncProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { PopupProvider } from "@/shared/popup/popup-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OfflineSyncProvider>
          <ServiceWorkerBootstrap />
          <PopupProvider>{children}</PopupProvider>
        </OfflineSyncProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
