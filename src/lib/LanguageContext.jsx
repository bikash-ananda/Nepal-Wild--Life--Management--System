import React, { createContext, useContext, useCallback } from "react";
import { translations } from "./translations";

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const setLang = useCallback(() => {}, []);

  const t = useCallback((key) => {
    return translations.en[key] || key;
  }, []);

  return (
    <LanguageContext.Provider value={{ lang: "en", setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
