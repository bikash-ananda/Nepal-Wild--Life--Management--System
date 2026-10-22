import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Satellite, WifiOff, Wifi, MapPin, Loader2, NotebookPen, Camera, History, Info, RefreshCw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function FieldCapture() {
  const { coords, error: gpsError, loading: gpsLoading, refreshing: gpsRefreshing, refresh: refreshGps } = useGeolocation();
  const online = useOnlineStatus();
  const [notes, setNotes] = useState("");
  const [locationName, setLocationName] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);
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

  const handleCapture = async (photoDataUrl) => {
    let location;
    if (useManualLocation) {
      const latitude = Number(manualLat);
      const longitude = Number(manualLng);
      if (!manualLat.trim() || !manualLng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        toast({ title: "Enter valid coordinates", description: "Latitude must be between -90 and 90 and longitude between -180 and 180.", variant: "destructive" });
        return;
      }
      location = { latitude, longitude, accuracy: null };
    } else {
      try {
        // Request a fresh high-accuracy fix at capture time so a photo does not inherit
        // an old location from when the page was opened.
        location = await refreshGps();
      } catch (error) {
        const recentEnough = coords?.timestamp && Date.now() - coords.timestamp < 90000;
        if (recentEnough && coords.accuracy <= 200) {
          location = coords;
          toast({ title: "Using the latest GPS fix", description: "A fresh location timed out, so this capture uses the recent fix shown on screen." });
        } else {
          toast({ title: "Could not get a reliable GPS fix", description: `${error.message} Refresh GPS or enter the farm coordinates manually.`, variant: "destructive" });
          return;
        }
      }
    }
    try {
      await enqueue({
        photoDataUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
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
              coords && !useManualLocation ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <Satellite className={`w-4 h-4 ${coords && !useManualLocation ? "text-emerald-600" : "text-slate-400"}`} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">
              {useManualLocation ? "Manual coordinates" : gpsLoading ? "Acquiring GPS…" : coords ? "GPS fix available" : "No GPS fix"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {useManualLocation
                ? "The entered farm coordinates will be attached to captures"
                : coords
                  ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} · accuracy ±${Math.round(coords.accuracy)} m${coords.timestamp ? ` · ${Math.max(0, Math.round((Date.now() - coords.timestamp) / 1000))}s ago` : ""}`
                  : gpsError || "Waiting for signal"}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={useManualLocation} onChange={(event) => setUseManualLocation(event.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          Use manually entered farm coordinates
        </label>
        <Button type="button" variant="outline" size="sm" onClick={() => refreshGps().catch(() => {})} disabled={gpsRefreshing}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${gpsRefreshing ? "animate-spin" : ""}`} />{gpsRefreshing ? "Getting GPS…" : "Refresh GPS"}
        </Button>
      </div>

      {(useManualLocation || !coords || gpsError) && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800"><MapPin className="h-3.5 w-3.5" /> Farm coordinates</div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" step="any" inputMode="decimal" value={manualLat} onChange={(event) => setManualLat(event.target.value)} placeholder="Latitude (e.g. 28.20)" aria-label="Manual latitude" />
          <Input type="number" step="any" inputMode="decimal" value={manualLng} onChange={(event) => setManualLng(event.target.value)} placeholder="Longitude (e.g. 83.98)" aria-label="Manual longitude" />
        </div>
        {gpsError && <p className="mt-2 text-[11px] text-amber-800">{gpsError} On phones, GPS requires location permission and a secure HTTPS page.</p>}
      </div>}

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

    </div>
  );
}
