import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { languages } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={cn("flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5", className)} role="group" aria-label="Language / भाषा">
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setLang(language.code)}
          className={cn(
            "min-h-10 rounded-md px-3 py-2 text-xs font-medium transition-colors",
            lang === language.code ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
          aria-pressed={lang === language.code}
          lang={language.code === "ne" ? "ne-NP" : "en"}
          title={language.label}
        >
          {language.native}
        </button>
      ))}
    </div>
  );
}
