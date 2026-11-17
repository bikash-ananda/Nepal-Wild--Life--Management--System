import React, { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function PwaUpdateNotice() {
  const { lang } = useLanguage();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
      hadController = true;
    };
    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      } catch { /* The installed version remains usable if update checks fail. */ }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("focus", checkForUpdate);
    checkForUpdate();
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  if (!updateReady) return null;
  return (
    <aside role="status" aria-live="polite" className="fixed inset-x-3 bottom-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-2xl sm:inset-x-auto sm:bottom-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-950">{lang === "ne" ? "WAMS को नयाँ संस्करण तयार छ" : "A new WAMS version is ready"}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{lang === "ne" ? "तपाईंको सुरक्षित रिपोर्टहरू नमेटाई अपडेट लागू गर्न सक्नुहुन्छ।" : "Update when ready. Reports saved on this device will be preserved."}</p>
      </div>
      <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-semibold text-white hover:bg-emerald-900">
        <RefreshCw className="h-3.5 w-3.5" />{lang === "ne" ? "अपडेट" : "Update"}
      </button>
      <button type="button" onClick={() => setUpdateReady(false)} aria-label={lang === "ne" ? "बन्द गर्नुहोस्" : "Dismiss"} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
    </aside>
  );
}
