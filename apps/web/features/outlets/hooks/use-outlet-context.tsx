"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

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
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setOutlets([]);
    setCurrentOutlet(null);
    setIsLoading(false);
  }, []);

  return (
    <OutletContext.Provider
      value={{
        currentOutlet,
        outlets,
        isLoading,
        setCurrentOutlet,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);

  if (!context) {
    throw new Error("useOutlet must be used inside OutletProvider");
  }

  return context;
}