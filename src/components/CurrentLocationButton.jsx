import React, { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

export default function CurrentLocationButton({ onCapture }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const capture = () => {
    if (!navigator.geolocation) {
      setMessage(t("location.unavailable"));
      return;
    }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: Math.round(coords.accuracy),
        };
        onCapture(location);
        setMessage(t("location.accuracy", { accuracy: location.accuracy }));
        setBusy(false);
      },
      (error) => {
        setMessage(error.code === error.PERMISSION_DENIED ? t("location.denied") : t("location.failed"));
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  return (
    <div className="mt-2 space-y-1">
      <Button type="button" variant="outline" onClick={capture} disabled={busy} className="min-h-11 w-full justify-center sm:w-auto">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
        {t("location.useCurrent")}
      </Button>
      {message && <p className="text-xs text-slate-600" role="status">{message}</p>}
    </div>
  );
}
