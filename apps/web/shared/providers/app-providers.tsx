"use client";

import { ReactNode } from "react";
import { PopupProvider } from "@/shared/popup";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <PopupProvider>{children}</PopupProvider>;
}
