"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getServerLanguageSnapshot,
  getStoredLanguage,
  Language,
  setStoredLanguage,
  subscribeLanguage,
} from "./language-store";
import { translations } from "./translations";

export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getStoredLanguage,
    getServerLanguageSnapshot
  );

  const t = useCallback(
    (key: string) => translations[language][key] ?? translations.en[key] ?? key,
    [language]
  );

  return {
    language,
    setLanguage: (nextLanguage: Language) => setStoredLanguage(nextLanguage),
    t,
  };
}
