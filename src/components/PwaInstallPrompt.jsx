import React, { useEffect, useMemo, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return typeof window !== "undefined"
    && (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true);
}

export default function PwaInstallPrompt() {
  const { lang } = useLanguage();
  const [installEvent, setInstallEvent] = useState(() => window.__wamsDeferredInstallPrompt || null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const ios = useMemo(isIosDevice, []);
  const ne = lang === "ne";

  useEffect(() => {
    const onPrompt = () => setInstallEvent(window.__wamsDeferredInstallPrompt || null);
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setShowHelp(false);
    };
    const onDisplayMode = () => setInstalled(isStandalone());
    window.addEventListener("wams-install-prompt-available", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", onDisplayMode);
    return () => {
      window.removeEventListener("wams-install-prompt-available", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.matchMedia?.("(display-mode: standalone)").removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installEvent) {
      setShowHelp((value) => !value);
      return;
    }
    setBusy(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setInstallEvent(null);
      } else {
        setInstallEvent(null);
      }
    } catch {
      setShowHelp(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="fixed bottom-3 left-3 right-3 z-[90] mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:bottom-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{ne ? "WLMS आफ्नो डिभाइसमा राख्नुहोस्" : "Install WLMS on this device"}</p>
          <p className="text-xs leading-5 text-slate-600">{ne ? "छिटो खोल्नुहोस्, छुट्टै App जस्तै प्रयोग गर्नुहोस्।" : "Quick access and an app-like experience, on or offline."}</p>
        </div>
        <button type="button" onClick={install} disabled={busy} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">
          <Download className="h-4 w-4" />{busy ? (ne ? "खुल्दैछ…" : "Opening…") : (ne ? "Install" : "Install")}
        </button>
        <button type="button" onClick={() => setInstalled(true)} aria-label={ne ? "बन्द गर्नुहोस्" : "Dismiss"} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      {showHelp && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
          {ios ? (
            <>
              <p className="mb-1 flex items-center gap-2 font-semibold"><Share className="h-4 w-4" />{ne ? "iPhone / iPad मा Install गर्ने तरिका" : "Install on iPhone or iPad"}</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>{ne ? "Safari मा यो वेबसाइट खोल्नुहोस्।" : "Open this website in Safari."}</li>
                <li>{ne ? "Share बटन थिच्नुहोस्।" : "Tap the Share button."}</li>
                <li>{ne ? "Add to Home Screen छान्नुहोस् र Add गर्नुहोस्।" : "Choose Add to Home Screen, then tap Add."}</li>
              </ol>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold">{ne ? "Browser बाट Install गर्ने तरिका" : "Install from your browser"}</p>
              <p>{ne ? "Android मा Chrome को ⋮ Menu बाट Install app वा Add to Home Screen छान्नुहोस्। Windows मा Edge/Chrome को Install आइकन वा Menu बाट Install this site as an app छान्नुहोस्। विकल्प नदेखिएमा हालको Browser ले App install समर्थन नगर्न सक्छ।" : "On Android, open Chrome’s ⋮ menu and choose Install app or Add to Home Screen. On Windows, use the Install icon or the Edge/Chrome menu and choose Install this site as an app. If no option appears, your current browser may not support PWA installation."}</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
