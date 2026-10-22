import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Satellite, WifiOff, Wifi, MapPin, Loader2, NotebookPen, Camera, History, Info } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import CameraViewfinder from "@/components/field/CameraViewfinder";
import CaptureResultCard from "@/components/field/CaptureResultCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function FieldCapture() {
  const { coords, error: gpsError, loading: gpsLoading } = useGeolocation();
  const online = useOnlineStatus();
  const [notes, setNotes] = useState("");
  const [locationName, setLocationName] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [lastCaptureAt, setLastCaptureAt] = useState(null);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    api.entities.Site.list().then((availableSites) => {
      setSites(availableSites);
      if (availableSites.length === 1) setSiteId(String(availableSites[0].id));
    }).catch(() => setSites([]));
  }, []);

  const { queue, enqueue, removeItem, flush, syncing, loadingQueue, storageError } = useCaptureQueue(online, () => {});

  const effectiveLat = coords?.latitude ?? (manualLat ? Number(manualLat) : null);
  const effectiveLng = coords?.longitude ?? (manualLng ? Number(manualLng) : null);

  const handleCapture = async (photoDataUrl) => {
    if (effectiveLat == null || effectiveLng == null) {
      toast({
        title: "No GPS coordinates",
        description: "Enter coordinates manually or enable location, then capture again.",
        variant: "destructive",
      });
    }
    try {
      await enqueue({
        photoDataUrl,
        latitude: effectiveLat,
        longitude: effectiveLng,
        accuracy: coords?.accuracy ?? null,
        site_id: siteId,
        location_name: locationName,
        notes,
        captured_at: new Date().toISOString(),
      });
    } catch (error) {
      toast({ title: "Capture could not be saved", description: error.message, variant: "destructive" });
      return;
    }
    setLastCaptureAt(Date.now());
    setNotes("");
    if (online) flush();
  };

  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "failed").length;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <PageHeader
        title="Field Capture"
        description="Use your phone camera to capture and auto-classify wildlife in the field — works offline."
        icon={Camera}
      />

      {/* Connectivity + GPS status strip */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 ${
            online ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          {online ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${online ? "text-emerald-700" : "text-amber-700"}`}>
              {online ? "Online" : "Offline"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {online ? "Captures process instantly" : `${pendingCount} queued — syncs when reconnected`}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 ${
            coords ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <Satellite className={`w-4 h-4 ${coords ? "text-emerald-600" : "text-slate-400"}`} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">
              {gpsLoading ? "Acquiring GPS…" : coords ? "GPS locked" : "No GPS"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {coords
                ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
                : gpsError || "Waiting for signal"}
            </div>
          </div>
        </div>
      </div>

      {storageError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Offline-safe storage is unavailable in this browser. Captures are disabled to avoid losing field evidence. {storageError}
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Capture column */}
        <div className="lg:col-span-3 space-y-4">
          <CameraViewfinder onCapture={handleCapture} disabled={Boolean(storageError) || loadingQueue || (syncing && online)} />

          <div className="space-y-3">
            {sites.length > 0 && <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Research site (optional)</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger><SelectValue placeholder="Choose an assigned site" /></SelectTrigger>
                <SelectContent>{sites.map((site) => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Location / Area name (optional)</Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Bardia Buffer Zone — Sector 3"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                <NotebookPen className="w-3 h-3" /> Notes (optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Behavior, condition, direction of movement…"
              />
            </div>
          </div>
        </div>

        {/* Queue / results column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <History className="w-4 h-4" /> Captures
              <span className="text-xs font-normal text-slate-400">({queue.length})</span>
            </h3>
            {(syncing || loadingQueue) && (
              <span className="flex items-center gap-1.5 text-xs text-sky-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {loadingQueue ? "Loading saved captures" : "Syncing"}
              </span>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <Camera className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No captures yet</p>
              <p className="text-xs text-slate-400 mt-1">Frame an animal and tap the capture button.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {queue.map((item) => (
                <CaptureResultCard
                  key={item.id}
                  item={item}
                  onRetry={() => flush()}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Captures upload securely when online and are stored as unverified observations for human review. AI-assisted classification will be enabled after the Ward 21 image set is reviewed. View records in{" "}
              <Link to="/sighting-history" className="text-emerald-600 font-medium underline">Sighting History</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Manual GPS fallback */}
      {gpsError && !coords && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
            <MapPin className="w-3.5 h-3.5" /> Enter coordinates manually
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Latitude (28.394)" />
            <Input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Longitude (81.383)" />
          </div>
        </div>
      )}
    </div>
  );
}
