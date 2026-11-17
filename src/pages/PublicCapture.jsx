import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Satellite, Loader2, Camera, RefreshCw, MapPin,
} from "lucide-react";
import CameraViewfinder from "@/components/field/CameraViewfinder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { createOfflineReportId, enqueueOfflineReport, syncOfflineReports, requestOfflineReportSync, requestOfflineStoragePersistence } from "@/lib/offlinePublicReports";

const labels = {
  en: {
    title: "Human Wildlife Conflict Management System", subtitle: "Report wildlife from anywhere in the world — no account needed",
    gpsLoading: "Acquiring GPS…", gpsLocked: "GPS locked", noGps: "No GPS fix", enableGps: "GPS can use satellite signals without internet. Allow location access; HTTPS is required. A fix may take longer or be unavailable in some places.", refreshGps: "Get / refresh GPS", gettingGps: "Getting location…", manualCoordinates: "Or enter coordinates manually", latitude: "Latitude", longitude: "Longitude", coordinatePair: "Enter both latitude and longitude, or leave both blank.", coordinateInvalid: "Check coordinates: latitude −90 to 90, longitude −180 to 180.",
    captured: "Captured photo", retake: "Retake", name: "Your name (optional)", namePlaceholder: "e.g. Ram Sharma", country: "Country", countryPlaceholder: "e.g. Nepal", countryRequired: "Enter the country where this photo was taken.", province: "State / Province / Region (optional)", district: "District / County (optional)", location: "Location / Area name", locationPlaceholder: "City, village, farm or landmark", notes: "Notes (optional)", notesPlaceholder: "What was the animal doing?", submit: "Submit report for review", submitting: "Submitting report…", thankYou: "Thank you! Your report was received.", flagship: "Priority species — reviewer attention requested", privacy: "Photos are stored privately. Reports are reviewed before they are treated as confirmed.", submitted: "Your report was received for human review.", language: "नेपाली", consent: "I agree to share this photo and its location with authorized project reviewers for conflict research.", locationRequired: "Location is required. Allow GPS or enter both coordinates manually.", gpsPrecision: "GPS is an estimate. Check its displayed accuracy before sending.",
  },
  np: {
    title: "मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", subtitle: "विश्वको जुनसुकै ठाउँबाट वन्यजन्तुको जानकारी दिनुहोस् — खाता आवश्यक छैन",
    gpsLoading: "GPS खोज्दै…", gpsLocked: "GPS प्राप्त भयो", noGps: "GPS स्थान प्राप्त भएन", enableGps: "GPS ले इन्टरनेटबिना पनि उपग्रहबाट स्थान लिन सक्छ। स्थान अनुमति दिनुहोस्; HTTPS आवश्यक छ। केही ठाउँमा स्थान पत्ता लगाउन समय लाग्न सक्छ।", refreshGps: "GPS लिनुहोस् / फेरि खोज्नुहोस्", gettingGps: "स्थान खोज्दै…", manualCoordinates: "वा निर्देशाङ्क आफैँ लेख्नुहोस्", latitude: "अक्षांश", longitude: "देशान्तर", coordinatePair: "अक्षांश र देशान्तर दुवै लेख्नुहोस् वा दुवै खाली छोड्नुहोस्।", coordinateInvalid: "निर्देशाङ्क जाँच्नुहोस्: अक्षांश −९० देखि ९० र देशान्तर −१८० देखि १८० सम्म।",
    captured: "तस्बिर खिचियो", retake: "फेरि खिच्नुहोस्", name: "तपाईंको नाम (वैकल्पिक)", namePlaceholder: "जस्तै: राम शर्मा", country: "देश", countryPlaceholder: "जस्तै: नेपाल", countryRequired: "तस्बिर खिचिएको देश लेख्नुहोस्।", province: "प्रदेश / राज्य / क्षेत्र (वैकल्पिक)", district: "जिल्ला / काउन्टी (वैकल्पिक)", location: "स्थान / क्षेत्र", locationPlaceholder: "सहर, गाउँ, खेत वा चिनारीको स्थान", notes: "टिप्पणी (वैकल्पिक)", notesPlaceholder: "जनावरले के गरिरहेको थियो?", submit: "समीक्षाका लागि पठाउनुहोस्", submitting: "पठाउँदै…", thankYou: "धन्यवाद! तपाईंको विवरण प्राप्त भयो।", flagship: "प्राथमिक प्रजाति — समीक्षकले हेर्नुपर्ने", privacy: "तस्बिर निजी रूपमा सुरक्षित हुन्छ। पुष्टि भएको मान्नुअघि विवरण समीक्षा गरिन्छ।", submitted: "तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", language: "English", consent: "द्वन्द्व अनुसन्धानका लागि अधिकृत परियोजना समीक्षकसँग यो तस्बिर र स्थान साझा गर्न म सहमत छु।", locationRequired: "स्थान आवश्यक छ। GPS अनुमति दिनुहोस् वा दुवै निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsPrecision: "GPS अनुमानित हुन्छ। पठाउनुअघि देखाइएको शुद्धता जाँच्नुहोस्।",
  },
};

export default function PublicCapture() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get("lang") === "np" ? "np" : "en";
  const t = labels[lang];
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsRefreshing, setGpsRefreshing] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);

  useEffect(() => {
    requestOfflineStoragePersistence().catch(() => {});
    const sync = () => {
      syncOfflineReports().catch(() => {});
      requestOfflineReportSync().catch(() => {});
    };
    sync();
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const [captureMetadata, setCaptureMetadata] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [captureLocationBusy, setCaptureLocationBusy] = useState(false);

  const localizeGpsError = (message) => {
    if (lang !== "np") return message;
    if (message?.includes("HTTPS")) return "स्थानका लागि HTTPS वेबसाइट खोल्नुहोस् र ब्राउजरमा अनुमति दिनुहोस्।";
    if (message?.includes("permission")) return "स्थान अनुमति रोकिएको छ। फोन वा ब्राउजरको सेटिङबाट अनुमति दिनुहोस्।";
    if (message?.includes("too long")) return "स्थान पत्ता लगाउन ढिलो भयो। खुला ठाउँमा फेरि प्रयास गर्नुहोस्।";
    if (message?.includes("not supported")) return "यो ब्राउजरले GPS उपलब्ध गराउँदैन। निर्देशाङ्क आफैँ लेख्नुहोस्।";
    return message;
  };

  const refreshGps = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error("Location is not supported by this browser.");
      setGpsError(error.message);
      reject(error);
      return;
    }
    setGpsLoading(true);
    setGpsRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
        };
        setCoords(point);
        setGpsError(null);
        resolve(point);
      },
      (cause) => {
        const message = !window.isSecureContext ? "Location access requires HTTPS."
          : cause?.code === 1 ? "Location permission is blocked."
          : cause?.code === 2 ? "The device could not determine its location."
          : cause?.code === 3 ? "Location took too long."
          : "Could not read the device location.";
        setGpsError(message);
        reject(new Error(message));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }).finally(() => {
    setGpsLoading(false);
    setGpsRefreshing(false);
  });

  const getManualPoint = () => {
    const hasLatitude = manualLatitude.trim() !== "";
    const hasLongitude = manualLongitude.trim() !== "";
    if (!hasLatitude && !hasLongitude) return null;
    if (!hasLatitude || !hasLongitude) throw new Error("COORDINATE_PAIR");
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw new Error("COORDINATES_INVALID");
    }
    return { latitude, longitude, accuracy: null };
  };

  const handleRefreshGps = async () => {
    try {
      await refreshGps();
    } catch { /* The hook exposes a clear, actionable GPS error in the status panel. */ }
  };

  const handleCapture = async (photoDataUrl) => {
    const capturedAt = new Date().toISOString();
    setPendingPhoto(photoDataUrl);
    const fixAge = coords?.timestamp ? Date.now() - Number(coords.timestamp) : Infinity;
    const freshFix = coords && fixAge >= 0 && fixAge <= 30000 ? { ...coords } : null;
    setCaptureMetadata({ captured_at: capturedAt, coords: freshFix });
    if (freshFix) return;
    setCaptureLocationBusy(true);
    try {
      const freshCoords = await refreshGps();
      setCaptureMetadata((metadata) => metadata ? { ...metadata, coords: freshCoords } : metadata);
    } catch {
      // The reporter can retry GPS or add coordinates manually if needed.
    } finally {
      setCaptureLocationBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!pendingPhoto) return;
    setSubmitting(true);
    try {
      const manualPoint = getManualPoint();
      // Keep the GPS fix captured for this photo; never silently substitute a later position.
      const point = manualPoint || captureMetadata?.coords;
      if (!point) throw new Error("LOCATION_REQUIRED");
      const blob = await (await fetch(pendingPhoto)).blob();
      const captureId = createOfflineReportId();
      const payload = {
        consent: true,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: manualPoint ? null : point.accuracy ?? null,
        location_name: [country.trim() ? `Country: ${country.trim()}` : "", locationName.trim()].filter(Boolean).join(" · "),
        province,
        district,
        submitter_name: submitterName,
        notes,
        captured_at: captureMetadata?.captured_at || new Date().toISOString(),
        location_captured_at: manualPoint ? null : (point.timestamp ? new Date(point.timestamp).toISOString() : null),
      };
      await enqueueOfflineReport({ id: captureId, kind: "capture", payload, photoBlob: blob });
      const result = await syncOfflineReports();
      if (result.pending > 0) requestOfflineReportSync().catch(() => {});
      setPendingPhoto(null);
      setCaptureMetadata(null);
      setConsent(false);
      setManualLatitude("");
      setManualLongitude("");
      toast({
        title: t.submitted,
        description: result.pending > 0
          ? (lang === "np" ? "रिपोर्ट फोनमा सुरक्षित भयो। इन्टरनेट उपलब्ध भएपछि स्वतः पठाइनेछ।" : "Report saved on this device. It will upload automatically when internet is available.")
          : (point.accuracy == null ? t.thankYou : `${t.gpsPrecision} (±${Math.round(point.accuracy)} m)`),
      });
    } catch (e) {
      const description = e.message === "COORDINATE_PAIR" ? t.coordinatePair
        : e.message === "COORDINATES_INVALID" ? t.coordinateInvalid
          : e.message === "LOCATION_REQUIRED" ? t.locationRequired
          : e.message || localizeGpsError(e.message);
      toast({ title: lang === "np" ? "रिपोर्ट सुरक्षित गर्न सकिएन" : "Could not save report", description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayedCoords = pendingPhoto ? captureMetadata?.coords : coords;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="sticky top-0 z-20 glass border-b border-emerald-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" aria-label={lang === "np" ? "WAMS मुख्य पृष्ठ" : "WAMS home"} className="shrink-0"><img src="/wams-logo.webp?v=4" alt="WAMS" width="52" height="52" fetchPriority="high" className="h-12 w-12 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-emerald-900/10" /></Link>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 leading-tight">{t.title}</h1>
            <p className="text-[11px] text-slate-500">{t.subtitle}</p>
          </div>
          <button type="button" onClick={() => setSearchParams({ lang: lang === "en" ? "np" : "en" })} className="ml-auto shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{t.language}</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16">
        {/* GPS status */}
        <div className={`mb-4 rounded-2xl border px-3.5 py-3 ${coords ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-2.5">
            <Satellite className={`mt-0.5 h-4 w-4 shrink-0 ${coords ? "text-emerald-600" : "text-slate-400"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-700">{captureLocationBusy ? t.gettingGps : gpsLoading ? t.gpsLoading : displayedCoords ? t.gpsLocked : t.noGps}</div>
              <div className="break-words text-[11px] text-slate-500">
                {displayedCoords ? `${displayedCoords.latitude.toFixed(6)}, ${displayedCoords.longitude.toFixed(6)} (±${Math.round(displayedCoords.accuracy)}m)` : gpsError ? localizeGpsError(gpsError) : t.enableGps}
              </div>
              {displayedCoords && <a className="mt-1 inline-flex text-[11px] font-semibold text-emerald-800 underline" href={`https://www.openstreetmap.org/?mlat=${displayedCoords.latitude}&mlon=${displayedCoords.longitude}#map=18/${displayedCoords.latitude}/${displayedCoords.longitude}`} target="_blank" rel="noreferrer">{lang === "np" ? "नक्सामा स्थान जाँच्नुहोस्" : "Check this point on a map"}</a>}
            </div>
            <button type="button" onClick={handleRefreshGps} disabled={gpsRefreshing} className="shrink-0 rounded-full border border-emerald-900/15 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 disabled:opacity-60">
              {gpsRefreshing ? t.gettingGps : t.refreshGps}
            </button>
          </div>
        </div>

        {/* Camera or pending preview */}
        {pendingPhoto ? (
          <div className="mb-4">
            <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden bg-slate-900">
              <img src={pendingPhoto} alt={t.captured} className="w-full h-full object-cover" />
              <button
                disabled={captureLocationBusy}
                onClick={() => { setPendingPhoto(null); setCaptureMetadata(null); setConsent(false); }}
                className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-black/55 text-white backdrop-blur"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {t.retake}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <CameraViewfinder onCapture={handleCapture} disabled={submitting} />
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-3">
          <p className="text-xs leading-5 text-emerald-950">{lang === "np" ? "जनावरको पहिचान वा व्यवहारबारे जान्न चाहनुहुन्छ?" : "Want to learn about the animal or compare species?"}</p>
          <a href={"/species-library?lang=" + lang} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-emerald-900/15 bg-white px-3 text-xs font-semibold text-emerald-900 underline-offset-2 hover:underline">{lang === "np" ? "वन्यजन्तु परिचय खोल्नुहोस्" : "Open wildlife guide"}</a>
        </div>

        {/* Optional details: no name or profile required for a public wildlife photo */}
        <details className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">{lang === "np" ? "थप विवरण (ऐच्छिक)" : "Add optional details"}</summary>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.name}</Label><Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder={t.namePlaceholder} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.country} ({lang === "np" ? "ऐच्छिक" : "optional"})</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" placeholder={t.countryPlaceholder} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.province}</Label><Input value={province} onChange={(e) => setProvince(e.target.value)} autoComplete="address-level1" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.district}</Label><Input value={district} onChange={(e) => setDistrict(e.target.value)} autoComplete="address-level2" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.location}</Label><Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder={t.locationPlaceholder} /></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-600">{t.manualCoordinates}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1.5"><Label className="text-xs text-slate-500">{t.latitude}</Label><Input inputMode="decimal" value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} placeholder="28.21" /></div>
                <div className="min-w-0 space-y-1.5"><Label className="text-xs text-slate-500">{t.longitude}</Label><Input inputMode="decimal" value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} placeholder="83.99" /></div>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">{t.notes}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t.notesPlaceholder} /></div>
          </div>
        </details>

        {/* Submit */}
        {pendingPhoto && (
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />
            {t.consent}
          </label>
        )}

        {pendingPhoto && (
          <button
            onClick={handleSubmit}
            disabled={submitting || captureLocationBusy || !consent}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-60 mb-4"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t.submitting}</>
            ) : (
              <><Camera className="w-5 h-5" /> {t.submit}</>
            )}
          </button>
        )}

        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" />
          {t.privacy}
        </p>
        <div className="mt-3 text-center"><Link to="/welcome" className="text-xs font-semibold text-emerald-800 underline underline-offset-4">{lang === "np" ? "सार्वजनिक मुख्य पृष्ठमा फर्कनुहोस्" : "Back to the public home page"}</Link></div>
      </main>
    </div>
  );
}
