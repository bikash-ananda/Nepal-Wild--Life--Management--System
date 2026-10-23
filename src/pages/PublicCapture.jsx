import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Satellite, Loader2, Camera, RefreshCw, MapPin,
} from "lucide-react";
import { api } from "@/api/apiClient";
import CameraViewfinder from "@/components/field/CameraViewfinder";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import PokharaLogo from "@/components/PokharaLogo";

const labels = {
  en: {
    title: "Human Wildlife Conflict Management System", subtitle: "Report wildlife from anywhere in the world — no account needed",
    gpsLoading: "Acquiring GPS…", gpsLocked: "GPS locked", noGps: "No GPS fix", enableGps: "Tap Get GPS and allow location access. HTTPS is required.", refreshGps: "Get / refresh GPS", gettingGps: "Getting location…", manualCoordinates: "Or enter coordinates manually", latitude: "Latitude", longitude: "Longitude", coordinatePair: "Enter both latitude and longitude, or leave both blank.", coordinateInvalid: "Check coordinates: latitude −90 to 90, longitude −180 to 180.",
    captured: "Captured photo", retake: "Retake", name: "Your name (optional)", namePlaceholder: "e.g. Ram Sharma", country: "Country", countryPlaceholder: "e.g. Nepal", countryRequired: "Enter the country where this photo was taken.", province: "State / Province / Region (optional)", district: "District / County (optional)", location: "Location / Area name", locationPlaceholder: "City, village, farm or landmark", notes: "Notes (optional)", notesPlaceholder: "What was the animal doing?", submit: "Submit report for review", submitting: "Submitting report…", thankYou: "Thank you! Your report was received.", flagship: "Priority species — reviewer attention requested", privacy: "Photos are stored privately. Reports are reviewed before they are treated as confirmed.", submitted: "Your report was received for human review.", language: "नेपाली", consent: "I agree to share this photo and its location with authorized project reviewers for conflict research.", locationRequired: "Location is required. Allow GPS or enter both coordinates manually.", gpsPrecision: "GPS is an estimate. Check its displayed accuracy before sending.",
  },
  np: {
    title: "मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", subtitle: "विश्वको जुनसुकै ठाउँबाट वन्यजन्तुको जानकारी दिनुहोस् — खाता आवश्यक छैन",
    gpsLoading: "GPS खोज्दै…", gpsLocked: "GPS प्राप्त भयो", noGps: "GPS स्थान प्राप्त भएन", enableGps: "GPS लिन थिच्नुहोस् र स्थान अनुमति दिनुहोस्। HTTPS आवश्यक छ।", refreshGps: "GPS लिनुहोस् / फेरि खोज्नुहोस्", gettingGps: "स्थान खोज्दै…", manualCoordinates: "वा निर्देशाङ्क आफैँ लेख्नुहोस्", latitude: "अक्षांश", longitude: "देशान्तर", coordinatePair: "अक्षांश र देशान्तर दुवै लेख्नुहोस् वा दुवै खाली छोड्नुहोस्।", coordinateInvalid: "निर्देशाङ्क जाँच्नुहोस्: अक्षांश −९० देखि ९० र देशान्तर −१८० देखि १८० सम्म।",
    captured: "तस्बिर खिचियो", retake: "फेरि खिच्नुहोस्", name: "तपाईंको नाम (वैकल्पिक)", namePlaceholder: "जस्तै: राम शर्मा", country: "देश", countryPlaceholder: "जस्तै: नेपाल", countryRequired: "तस्बिर खिचिएको देश लेख्नुहोस्।", province: "प्रदेश / राज्य / क्षेत्र (वैकल्पिक)", district: "जिल्ला / काउन्टी (वैकल्पिक)", location: "स्थान / क्षेत्र", locationPlaceholder: "सहर, गाउँ, खेत वा चिनारीको स्थान", notes: "टिप्पणी (वैकल्पिक)", notesPlaceholder: "जनावरले के गरिरहेको थियो?", submit: "समीक्षाका लागि पठाउनुहोस्", submitting: "पठाउँदै…", thankYou: "धन्यवाद! तपाईंको विवरण प्राप्त भयो।", flagship: "प्राथमिक प्रजाति — समीक्षकले हेर्नुपर्ने", privacy: "तस्बिर निजी रूपमा सुरक्षित हुन्छ। पुष्टि भएको मान्नुअघि विवरण समीक्षा गरिन्छ।", submitted: "तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", language: "English", consent: "द्वन्द्व अनुसन्धानका लागि अधिकृत परियोजना समीक्षकसँग यो तस्बिर र स्थान साझा गर्न म सहमत छु।", locationRequired: "स्थान आवश्यक छ। GPS अनुमति दिनुहोस् वा दुवै निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsPrecision: "GPS अनुमानित हुन्छ। पठाउनुअघि देखाइएको शुद्धता जाँच्नुहोस्।",
  },
};

export default function PublicCapture() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get("lang") === "np" ? "np" : "en";
  const t = labels[lang];
  const { coords, error: gpsError, loading: gpsLoading, refresh: refreshGps, refreshing: gpsRefreshing } = useGeolocation();
  const [submitterName, setSubmitterName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);
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
      // Keep the recent GPS fix, if any; its accuracy is shown to the reporter.
    } finally {
      setCaptureLocationBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!pendingPhoto) return;
    setSubmitting(true);
    try {
      if (!country.trim()) throw new Error("COUNTRY_REQUIRED");
      const manualPoint = getManualPoint();
      // Use the fix tied to this photo, never a stale background fix.
      const point = manualPoint || captureMetadata?.coords;
      if (!point) throw new Error("LOCATION_REQUIRED");
      // Upload the photo privately first (no login required on a public app)
      let photo_uri;
      try {
        const blob = await (await fetch(pendingPhoto)).blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const up = await api.integrations.Core.UploadPublicFile({ file });
        photo_uri = up.file_uri;
      } catch (e) {
        toast({ title: "Photo upload failed", description: e.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      await api.functions.invoke("publicCapture", {
        photo_uri,
        consent,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: manualPoint ? null : point.accuracy ?? null,
        location_name: [country.trim() ? `Country: ${country.trim()}` : "", locationName.trim()].filter(Boolean).join(" · "),
        province,
        district,
        submitter_name: submitterName,
        notes,
        captured_at: captureMetadata?.captured_at || new Date().toISOString(),
      });
      setPendingPhoto(null);
      setCaptureMetadata(null);
      setConsent(false);
      setManualLatitude("");
      setManualLongitude("");
      toast({
        title: t.submitted,
        description: point.accuracy == null ? t.thankYou : `${t.gpsPrecision} (±${Math.round(point.accuracy)} m)`,
      });
    } catch (e) {
      const description = e.message === "COORDINATE_PAIR" ? t.coordinatePair
        : e.message === "COORDINATES_INVALID" ? t.coordinateInvalid
          : e.message === "COUNTRY_REQUIRED" ? t.countryRequired
          : e.message === "LOCATION_REQUIRED" ? t.locationRequired
          : localizeGpsError(e.message);
      toast({ title: "Submission failed", description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayedCoords = pendingPhoto ? captureMetadata?.coords : coords;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="sticky top-0 z-20 glass border-b border-emerald-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/login" aria-label={lang === "np" ? "आधिकारिक लगइन खोल्नुहोस्" : "Open official login"} className="shrink-0"><PokharaLogo className="h-10 w-10 shadow-sm" /></Link>
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

        {/* Optional details */}
        <div className="space-y-3 mb-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{t.name}</Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{t.country}</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" placeholder={t.countryPlaceholder} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">{t.province}</Label>
              <Input value={province} onChange={(e) => setProvince(e.target.value)} autoComplete="address-level1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">{t.district}</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} autoComplete="address-level2" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{t.location}</Label>
            <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder={t.locationPlaceholder} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">{t.manualCoordinates}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-1.5"><Label className="text-xs text-slate-500">{t.latitude}</Label><Input inputMode="decimal" value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} placeholder="28.21" /></div>
              <div className="min-w-0 space-y-1.5"><Label className="text-xs text-slate-500">{t.longitude}</Label><Input inputMode="decimal" value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} placeholder="83.99" /></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{t.notes}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t.notesPlaceholder} />
          </div>
        </div>

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
