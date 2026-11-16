import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, normalizeLanguage, translate } from "./language";

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (key) => translate("en", key) });

export function LanguageProvider({ children }) {
  const [lang, setLanguage] = useState(() => getInitialLanguage());

  const setLang = useCallback((value) => {
    const nextLanguage = normalizeLanguage(value);
    setLanguage(nextLanguage);
    try {
      globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // The in-memory language choice remains usable when storage is disabled.
    }
  }, []);

  useEffect(() => {
    if (globalThis.document?.documentElement) {
      document.documentElement.lang = lang === "ne" ? "ne-NP" : "en";
    }
  }, [lang]);

  const t = useCallback((key, values) => translate(lang, key, values), [lang]);
  const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
