import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { languages } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={cn("flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5", className)}>
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={cn(
            "px-2 py-1 rounded-md text-xs font-medium transition-colors",
            lang === l.code ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
          title={l.label}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}