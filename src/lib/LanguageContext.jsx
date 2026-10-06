import React, { createContext, useContext, useState, useCallback } from "react";
import { translations } from "./translations";

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("app_lang") || "en"; } catch { return "en"; }
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("app_lang", l); } catch {}
  }, []);

  const t = useCallback((key) => {
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}