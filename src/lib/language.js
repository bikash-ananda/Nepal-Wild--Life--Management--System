import { translations } from "./translations.js";

export const LANGUAGE_STORAGE_KEY = "wams.language";
const supportedLanguages = new Set(Object.keys(translations));

export function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase().split("-")[0];
  return supportedLanguages.has(normalized) ? normalized : "en";
}

export function getInitialLanguage(storage, browserLanguage = globalThis.navigator?.language) {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(LANGUAGE_STORAGE_KEY);
    if (saved) return normalizeLanguage(saved);
  } catch {
    // Storage can be unavailable in private browsing; fall through to browser language.
  }
  return normalizeLanguage(browserLanguage);
}

export function translate(language, key, values = {}) {
  const message = translations[normalizeLanguage(language)]?.[key] ?? translations.en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (placeholder, name) => values[name] == null ? placeholder : String(values[name]));
}
export function translateWithFallback(language, key, fallback, values = {}) {
  const message = translations[normalizeLanguage(language)]?.[key] ?? translations.en[key] ?? fallback;
  return String(message).replace(/\{(\w+)\}/g, (placeholder, name) => values[name] == null ? placeholder : String(values[name]));
}
