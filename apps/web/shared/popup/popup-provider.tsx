"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type PopupContextValue = {
  activePopupId: string | null;
  isPopupOpen: (popupId: string) => boolean;
  openPopup: (popupId: string) => void;
  closePopup: (popupId?: string) => void;
  togglePopup: (popupId: string) => void;
};

const PopupContext = createContext<PopupContextValue | null>(null);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const isPopupOpen = useCallback(
    (popupId: string) => activePopupId === popupId,
    [activePopupId]
  );

  const openPopup = useCallback((popupId: string) => {
    setActivePopupId(popupId);
  }, []);

  const closePopup = useCallback((popupId?: string) => {
    setActivePopupId((current) => {
      if (!popupId) return null;
      return current === popupId ? null : current;
    });
  }, []);

  const togglePopup = useCallback((popupId: string) => {
    setActivePopupId((current) => (current === popupId ? null : popupId));
  }, []);

  const value = useMemo(
    () => ({
      activePopupId,
      isPopupOpen,
      openPopup,
      closePopup,
      togglePopup,
    }),
    [activePopupId, isPopupOpen, openPopup, closePopup, togglePopup]
  );

  return (
    <PopupContext.Provider value={value}>
      {children}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error("usePopup must be used within PopupProvider");
  }

  return context;
}
