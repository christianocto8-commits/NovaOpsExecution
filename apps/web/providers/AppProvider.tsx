"use client";

import { ReactNode } from "react";

import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";
import { NativePushBootstrap } from "@/components/NativePushBootstrap";
import { AuthProvider } from "@/providers/AuthProvider";
import { OutletOnlyGate } from "@/components/OutletOnlyGate";
import { OfflineSyncProvider } from "@/providers/OfflineSyncProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { PopupProvider } from "@/shared/popup/popup-provider";
import { CommandCenterProvider } from "@/shared/command-center/providers/command-provider";
import { CommandCenter } from "@/shared/command-center/components/command-center";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OutletOnlyGate>
        <OfflineSyncProvider>
          <CommandCenterProvider>
            <ServiceWorkerBootstrap />
            <NativePushBootstrap />
            <PopupProvider>
              {children}
              <CommandCenter />
            </PopupProvider>
          </CommandCenterProvider>
        </OfflineSyncProvider>
        </OutletOnlyGate>
      </AuthProvider>
    </QueryProvider>
  );
}
