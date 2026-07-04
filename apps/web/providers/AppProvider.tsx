"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { PopupProvider } from "@/shared/popup/popup-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PopupProvider>{children}</PopupProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
