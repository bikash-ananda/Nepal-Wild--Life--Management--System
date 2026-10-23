import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Satellite, Loader2, CheckCircle2, Leaf, ShieldCheck, Camera, RefreshCw, MapPin,
} from "lucide-react";
import { api } from "@/api/apiClient";
import CameraViewfinder from "@/components/field/CameraViewfinder";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const NEPAL_PROVINCES = [
  "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim",
];

const labels = {
  en: {
    title: "Nepal Human–Wildlife Conflict Management System", subtitle: "Report wildlife from anywhere — no account needed",
    gpsLoading: "Acquiring GPS…", gpsLocked: "GPS locked", noGps: "No GPS", enableGps: "Enable location for auto-coordinates",
    captured: "Captured photo", retake: "Retake", name: "Your name (optional)", namePlaceholder: "e.g. Ram Sharma", province: "Province", selectProvince: "Select province", district: "District", districtPlaceholder: "e.g. Kaski", location: "Location / Area name", locationPlaceholder: "e.g. Farm, Ward 21", notes: "Notes (optional)", notesPlaceholder: "What was the animal doing?", submit: "Submit report for review", submitting: "Submitting report…", thankYou: "Thank you! Your report was received.", species: "Species:", unknown: "Unknown", behavior: "Behavior:", flagship: "Flagship species — alert sent to rangers", matched: "Matched to known individual:", pending: "New individual registered for ranger review.", privacy: "Photos are stored privately. By submitting, you help track wildlife across Nepal.", login: "Officer login →", submitted: "Your report was received for human review.", language: "नेपाली", consent: "I agree to share this photo and its location with authorized project reviewers for conflict research.",
  },
  np: {
    title: "नेपाल मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", subtitle: "कुनै पनि ठाउँबाट वन्यजन्तुको जानकारी दिनुहोस् — खाता आवश्यक छैन",
    gpsLoading: "GPS खोज्दै…", gpsLocked: "GPS प्राप्त भयो", noGps: "GPS उपलब्ध छैन", enableGps: "स्वचालित स्थानका लागि लोकेसन अनुमति दिनुहोस्",
    captured: "तस्बिर खिचियो", retake: "फेरि खिच्नुहोस्", name: "तपाईंको नाम (वैकल्पिक)", namePlaceholder: "जस्तै: राम शर्मा", province: "प्रदेश", selectProvince: "प्रदेश छान्नुहोस्", district: "जिल्ला", districtPlaceholder: "जस्तै: कास्की", location: "स्थान / क्षेत्र", locationPlaceholder: "जस्तै: खेत, वडा २१", notes: "टिप्पणी (वैकल्पिक)", notesPlaceholder: "जनावरले के गरिरहेको थियो?", submit: "समीक्षाका लागि पठाउनुहोस्", submitting: "पठाउँदै…", thankYou: "धन्यवाद! तपाईंको विवरण प्राप्त भयो।", species: "प्रजाति:", unknown: "अज्ञात", behavior: "व्यवहार:", flagship: "महत्त्वपूर्ण प्रजाति — वनकर्मीलाई सूचना पठाइयो", matched: "पहिचान भएको जनावरसँग मिल्यो:", pending: "नयाँ जनावर वनकर्मीको समीक्षाका लागि दर्ता भयो।", privacy: "तस्बिर निजी रूपमा सुरक्षित हुन्छ। तपाईंको जानकारीले नेपालभरिका वन्यजन्तुको अध्ययनमा सहयोग गर्छ।", login: "अधिकारी लगइन →", submitted: "तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", language: "English", consent: "द्वन्द्व अनुसन्धानका लागि अधिकृत परियोजना समीक्षकसँग यो तस्बिर र स्थान साझा गर्न म सहमत छु।",
  },
};

export default function PublicCapture() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get("lang") === "np" ? "np" : "en";
  const t = labels[lang];
  const { coords, error: gpsError, loading: gpsLoading } = useGeolocation();
  const [submitterName, setSubmitterName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [captureMetadata, setCaptureMetadata] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [consent, setConsent] = useState(false);

  const handleCapture = (photoDataUrl) => {
    setPendingPhoto(photoDataUrl);
    setCaptureMetadata({ captured_at: new Date().toISOString(), coords: coords ? { ...coords } : null });
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!pendingPhoto) return;
    setSubmitting(true);
    setResult(null);
    try {
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

      const res = await api.functions.invoke("publicCapture", {
        photo_uri,
        consent,
        latitude: captureMetadata?.coords?.latitude ?? coords?.latitude ?? null,
        longitude: captureMetadata?.coords?.longitude ?? coords?.longitude ?? null,
        accuracy: captureMetadata?.coords?.accuracy ?? coords?.accuracy ?? null,
        location_name: locationName,
        province,
        district,
        submitter_name: submitterName,
        notes,
        captured_at: captureMetadata?.captured_at || new Date().toISOString(),
      });
      setResult(res.data);
      setPendingPhoto(null);
      setCaptureMetadata(null);
      setConsent(false);
      toast({
        title: "Report submitted!",
        description: res.data?.classification?.species_name
          ? `Identified as ${res.data.classification.species_name}`
          : "Received — thank you",
      });
    } catch (e) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="sticky top-0 z-20 glass border-b border-emerald-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Leaf className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 leading-tight">{t.title}</h1>
            <p className="text-[11px] text-slate-500">{t.subtitle}</p>
          </div>
          <button type="button" onClick={() => setSearchParams({ lang: lang === "en" ? "np" : "en" })} className="ml-auto shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{t.language}</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16">
        {/* GPS status */}
        <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 mb-4 ${coords ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <Satellite className={`w-4 h-4 ${coords ? "text-emerald-600" : "text-slate-400"}`} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">
              {gpsLoading ? t.gpsLoading : coords ? t.gpsLocked : t.noGps}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {coords
                ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
                : gpsError || t.enableGps}
            </div>
          </div>
        </div>

        {/* Camera or pending preview */}
        {pendingPhoto ? (
          <div className="mb-4">
            <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden bg-slate-900">
              <img src={pendingPhoto} alt={t.captured} className="w-full h-full object-cover" />
              <button
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">{t.province}</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger><SelectValue placeholder={t.selectProvince} /></SelectTrigger>
                <SelectContent>
                  {NEPAL_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">{t.district}</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t.districtPlaceholder} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{t.location}</Label>
            <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder={t.locationPlaceholder} />
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
            disabled={submitting || !consent}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-60 mb-4"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t.submitting}</>
            ) : (
              <><Camera className="w-5 h-5" /> {t.submit}</>
            )}
          </button>
        )}

        {result && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-800">{t.thankYou}</h3>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                <span className="text-slate-500">{t.species}</span>{" "}
                <span className="font-medium">{result.classification?.species_name || t.unknown}</span>
                {result.classification?.confidence ? ` (${Math.round(result.classification.confidence * 100)}%)` : ""}
              </p>
              {result.classification?.scientific_name && (
                <p className="text-xs text-slate-500 italic">{result.classification.scientific_name}</p>
              )}
              {result.classification?.behavior && (
                <p><span className="text-slate-500">{t.behavior}</span> {result.classification.behavior}</p>
              )}
              {result.flagship && (
                <p className="text-amber-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> {t.flagship}
                </p>
              )}
              {result.individual_match?.auto_linked && (
                <p className="text-emerald-700 font-medium">
                  {t.matched} {result.individual_match.auto_linked.nickname}
                </p>
              )}
              {result.individual_match?.pending && (
                <p className="text-slate-500 text-xs">{t.pending}</p>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" />
          {t.privacy}{" "}
          <Link to="/login" className="text-emerald-600 underline ml-1">{t.login}</Link>
        </p>
      </main>
    </div>
  );
}
