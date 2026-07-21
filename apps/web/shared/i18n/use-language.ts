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

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getStoredLanguage,
    getServerLanguageSnapshot
  );

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      return values ? interpolate(template, values) : template;
    },
    [language]
  );

  return {
    language,
    setLanguage: (nextLanguage: Language) => setStoredLanguage(nextLanguage),
    t,
  };
}
