"use client";

export type Language = "en" | "id";

const LANGUAGE_STORAGE_KEY = "novaops_language";
const LANGUAGE_CHANGE_EVENT = "novaops-language-change";

export function normalizeLanguage(value?: string | null): Language {
  return value === "id" ? "id" : "en";
}

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  return normalizeLanguage(
    localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? localStorage.getItem("novaops_outlet_language")
  );
}

export function setStoredLanguage(language: Language) {
  if (typeof window === "undefined") return;

  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  localStorage.setItem("novaops_outlet_language", language);
  window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

export function subscribeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

export function getServerLanguageSnapshot(): Language {
  return "en";
}
