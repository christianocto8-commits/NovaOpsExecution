"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Outlet = {
  id: number | string;
  name: string;
};

type OutletContextValue = {
  currentOutlet: Outlet | null;
  outlets: Outlet[];
  isLoading: boolean;
  setCurrentOutlet: (outlet: Outlet | null) => void;
};

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [outlets] = useState<Outlet[]>([]);
  const [isLoading] = useState(false);

  const value = useMemo<OutletContextValue>(
    () => ({
      currentOutlet,
      outlets,
      isLoading,
      setCurrentOutlet,
    }),
    [currentOutlet, outlets, isLoading]
  );

  return (
    <OutletContext.Provider value={value}>{children}</OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);

  if (!context) {
    throw new Error("useOutlet must be used inside OutletProvider");
  }

  return context;
}
