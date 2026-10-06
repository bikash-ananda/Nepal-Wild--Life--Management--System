import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Satellite, Loader2, CheckCircle2, Leaf, ShieldCheck, Camera, RefreshCw, MapPin,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
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

export default function PublicCapture() {
  const { coords, error: gpsError, loading: gpsLoading } = useGeolocation();
  const [submitterName, setSubmitterName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleCapture = (photoDataUrl) => {
    setPendingPhoto(photoDataUrl);
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
        const up = await base44.integrations.Core.UploadPrivateFile({ file });
        photo_uri = up.file_uri;
      } catch (e) {
        toast({ title: "Photo upload failed", description: e.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const res = await base44.functions.invoke("publicCapture", {
        photo_uri,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        location_name: locationName,
        province,
        district,
        submitter_name: submitterName,
        notes,
        captured_at: new Date().toISOString(),
      });
      setResult(res.data);
      setPendingPhoto(null);
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
            <h1 className="font-bold text-slate-800 leading-tight">National Wildlife Network</h1>
            <p className="text-[11px] text-slate-500">Report wildlife from anywhere — no account needed</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-16">
        {/* GPS status */}
        <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 mb-4 ${coords ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <Satellite className={`w-4 h-4 ${coords ? "text-emerald-600" : "text-slate-400"}`} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">
              {gpsLoading ? "Acquiring GPS…" : coords ? "GPS locked" : "No GPS"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {coords
                ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
                : gpsError || "Enable location for auto-coordinates"}
            </div>
          </div>
        </div>

        {/* Camera or pending preview */}
        {pendingPhoto ? (
          <div className="mb-4">
            <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden bg-slate-900">
              <img src={pendingPhoto} alt="Captured" className="w-full h-full object-cover" />
              <button
                onClick={() => setPendingPhoto(null)}
                className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-black/55 text-white backdrop-blur"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retake
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
            <Label className="text-xs text-slate-500">Your name (optional)</Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="e.g. Ram Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  {NEPAL_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">District</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Chitwan" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Location / Area name</Label>
            <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Community Forest, Ward 4" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What was the animal doing?" />
          </div>
        </div>

        {/* Submit */}
        {pendingPhoto && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-60 mb-4"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing your photo…</>
            ) : (
              <><Camera className="w-5 h-5" /> Submit report</>
            )}
          </button>
        )}

        {result && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-800">Thank you! Your report was received.</h3>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                <span className="text-slate-500">Species:</span>{" "}
                <span className="font-medium">{result.classification?.species_name || "Unknown"}</span>
                {result.classification?.confidence ? ` (${Math.round(result.classification.confidence * 100)}%)` : ""}
              </p>
              {result.classification?.scientific_name && (
                <p className="text-xs text-slate-500 italic">{result.classification.scientific_name}</p>
              )}
              {result.classification?.behavior && (
                <p><span className="text-slate-500">Behavior:</span> {result.classification.behavior}</p>
              )}
              {result.flagship && (
                <p className="text-amber-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Flagship species — alert sent to rangers
                </p>
              )}
              {result.individual_match?.auto_linked && (
                <p className="text-emerald-700 font-medium">
                  Matched to known individual: {result.individual_match.auto_linked.nickname}
                </p>
              )}
              {result.individual_match?.pending && (
                <p className="text-slate-500 text-xs">New individual registered for ranger review.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" />
          Photos are stored privately. By submitting, you help track wildlife across Nepal.{" "}
          <Link to="/login" className="text-emerald-600 underline ml-1">Officer login →</Link>
        </p>
      </main>
    </div>
  );
}