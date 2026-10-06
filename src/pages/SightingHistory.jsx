import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Route, Clock, Fingerprint, Footprints, ArrowRight, ScanFace } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PrivateImage from "@/components/PrivateImage";
import { FadeIn } from "@/components/motion/MotionKit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SightingTimeline from "@/components/individuals/SightingTimeline";
import IdentifyIndividualModal from "@/components/individuals/IdentifyIndividualModal";

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

export default function SightingHistory() {
  const [individuals, setIndividuals] = useState([]);
  const [selectedId, setSelectedId] = useState("all");
  const [detections, setDetections] = useState([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [identifyOpen, setIdentifyOpen] = useState(false);

  useEffect(() => {
    base44.entities.AnimalIndividual.filter({ active: true }, { sort: "-last_seen_at", limit: 100 })
      .then((res) => setIndividuals(res.items || res || []))
      .catch(() => {})
      .finally(() => {});
  }, []);

  // Load sightings for selected individual, or all sightings across individuals
  useEffect(() => {
    setLoading(true);
    const detFilter = selectedId === "all" ? { individual_id: { $ne: null } } : { individual_id: selectedId };
    const obsFilter = selectedId === "all" ? { individual_id: { $ne: null } } : { individual_id: selectedId };
    Promise.all([
      base44.entities.DetectionEvent.filter(detFilter, { sort: "-detected_at", limit: 100 }),
      base44.entities.WildlifeObservation.filter(obsFilter, { sort: "-observed_at", limit: 100 }),
    ])
      .then(([dRes, oRes]) => {
        setDetections(dRes.items || dRes || []);
        setObservations(oRes.items || oRes || []);
      })
      .catch(() => {
        setDetections([]);
        setObservations([]);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedIndividual = useMemo(
    () => individuals.find((i) => i.id === selectedId) || null,
    [individuals, selectedId]
  );

  // Merge into a unified, sorted sighting list
  const sightings = useMemo(() => {
    const indById = new Map(individuals.map((i) => [i.id, i]));
    const dItems = detections.map((d) => ({
      id: d.id,
      _kind: "detection",
      _date: d.detected_at || d.created_date,
      _photo: d.image_url,
      _location: d.site_name,
      _time: d.detected_at ? new Date(d.detected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
      _coords: d.latitude && d.longitude ? `${Number(d.latitude).toFixed(3)}, ${Number(d.longitude).toFixed(3)}` : null,
      latitude: d.latitude,
      longitude: d.longitude,
      match_confidence: d.match_confidence,
      _individual: indById.get(d.individual_id) || null,
    }));
    const oItems = observations.map((o) => ({
      id: o.id,
      _kind: "observation",
      _date: o.observed_at || o.created_date,
      _photo: o.photos && o.photos[0],
      _location: o.location_name,
      _time: o.observed_at ? new Date(o.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
      _coords: o.latitude && o.longitude ? `${Number(o.latitude).toFixed(3)}, ${Number(o.longitude).toFixed(3)}` : null,
      latitude: o.latitude,
      longitude: o.longitude,
      match_confidence: o.match_confidence,
      _individual: indById.get(o.individual_id) || null,
    }));
    return [...dItems, ...oItems].sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0));
  }, [detections, observations, individuals]);

  // Stats
  const stats = useMemo(() => {
    const geoSightings = sightings.filter((s) => s.latitude && s.longitude);
    const distinctLocations = new Set(
      sightings.map((s) => s._location).filter(Boolean)
    ).size;
    const distinctCoords = new Set(geoSightings.map((s) => `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`)).size;
    const dates = sightings.map((s) => new Date(s._date).getTime()).filter(Boolean).sort((a, b) => a - b);
    const first = dates.length ? dates[0] : null;
    const last = dates.length ? dates[dates.length - 1] : null;

    // Average resighting interval (days between consecutive sightings)
    let avgIntervalDays = null;
    if (dates.length > 1) {
      const intervals = [];
      for (let i = 1; i < dates.length; i++) intervals.push((dates[i] - dates[i - 1]) / 86400000);
      avgIntervalDays = Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10;
    }

    // Movement track for a single individual (chronological)
    const track = selectedIndividual
      ? geoSightings
          .filter((s) => s.latitude && s.longitude)
          .map((s) => ({ ...s, _t: new Date(s._date).getTime() }))
          .sort((a, b) => a._t - b._t)
          .map((s) => [s.latitude, s.longitude])
      : [];

    return {
      total: sightings.length,
      distinctLocations: Math.max(distinctLocations, distinctCoords),
      first,
      last,
      avgIntervalDays,
      geoCount: geoSightings.length,
      track,
    };
  }, [sightings, selectedIndividual]);

  const geoSightings = sightings.filter((s) => s.latitude && s.longitude);
  const hasMap = geoSightings.length > 0;
  const mapCenter = hasMap
    ? [geoSightings[0].latitude, geoSightings[0].longitude]
    : [27.7, 85.3];

  return (
    <div>
      <PageHeader
        title="Sighting History"
        description="Timeline of when and where each individually-identified animal has been re-sighted."
        icon={Footprints}
        actions={
          <Button variant="outline" onClick={() => setIdentifyOpen(true)} className="border-emerald-300 text-emerald-700">
            <ScanFace className="w-4 h-4 mr-2" /> Match a Sighting
          </Button>
        }
      />

      {/* Individual selector */}
      <FadeIn className="mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Fingerprint className="w-4 h-4 text-emerald-600" /> Individual
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="sm:w-80">
              <SelectValue placeholder="Choose an individual" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All individuals (combined)</SelectItem>
              {individuals.map((ind) => (
                <SelectItem key={ind.id} value={ind.id}>
                  {ind.nickname || ind.individual_code} · {ind.species_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedIndividual && (
            <Link to={`/individuals/${selectedIndividual.id}`} className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1 ml-auto">
              Open profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : sightings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Footprints}
            title="No re-sightings yet"
            description={
              selectedId === "all"
                ? "Once you match a sighting to a registered individual, its timeline of re-sightings will appear here."
                : "This individual has no linked re-sightings yet. Use “Match a Sighting” to record one."
            }
          />
        </div>
      ) : (
        <>
          {/* Stats */}
          <FadeIn className="mb-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile icon={Footprints} label="Total re-sightings" value={stats.total} tone="emerald" />
              <StatTile icon={MapPin} label="Distinct locations" value={stats.distinctLocations} tone="blue" />
              <StatTile icon={Calendar} label="Tracking period" value={stats.first && stats.last ? `${Math.round((stats.last - stats.first) / 86400000)}d` : "—"} sub={stats.first && stats.last ? `${new Date(stats.first).toLocaleDateString()} → ${new Date(stats.last).toLocaleDateString()}` : "—"} tone="violet" />
              <StatTile icon={Clock} label="Avg. interval" value={stats.avgIntervalDays != null ? `${stats.avgIntervalDays}d` : "—"} sub="between re-sightings" tone="amber" />
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SightingTimeline sightings={sightings} individual={selectedIndividual} />
            </div>

            <div className="space-y-6">
              {/* Map */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Route className="w-4 h-4 text-emerald-600" /> Sighting map
                </h3>
                {hasMap ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-72">
                    <MapContainer center={mapCenter} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                      {selectedIndividual && stats.track.length > 1 && (
                        <Polyline positions={stats.track} pathOptions={{ color: "#10b981", weight: 2, dashArray: "5,6", opacity: 0.7 }} />
                      )}
                      {geoSightings.map((s, i) => (
                        <CircleMarker
                          key={i}
                          center={[s.latitude, s.longitude]}
                          radius={i === 0 ? 9 : 6}
                          pathOptions={{
                            color: i === 0 ? "#059669" : "#10b981",
                            fillColor: i === 0 ? "#059669" : "#10b981",
                            fillOpacity: i === 0 ? 0.9 : 0.6,
                          }}
                        >
                          <Tooltip>
                            {s._location || `Sighting ${geoSightings.length - i}`}
                            {s._time ? ` · ${s._time}` : ""}
                          </Tooltip>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-sm text-slate-400 text-center px-4">
                    No geocoded sightings yet. Linked detections and observations with coordinates will appear on this map.
                  </div>
                )}
                {selectedIndividual && stats.track.length > 1 && (
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                    <Route className="w-3 h-3" /> Dashed line shows chronological movement between {stats.track.length} sightings.
                  </p>
                )}
              </div>

              {/* Quick gallery */}
              {selectedId === "all" && individuals.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Tracked individuals</h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {individuals.map((ind) => (
                      <button
                        key={ind.id}
                        onClick={() => setSelectedId(ind.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-colors ${
                          selectedId === ind.id ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {ind.reference_photos && ind.reference_photos[0] ? (
                            <PrivateImageSmall uri={ind.reference_photos[0]} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Fingerprint className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{ind.nickname || ind.individual_code}</div>
                          <div className="text-[11px] text-slate-400 truncate">{ind.species_name}</div>
                        </div>
                        <div className="text-xs font-semibold text-emerald-700">{ind.sighting_count || 0}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <IdentifyIndividualModal open={identifyOpen} onOpenChange={setIdentifyOpen} onConfirmed={() => setSelectedId((s) => s)} />
    </div>
  );
}

function PrivateImageSmall({ uri }) {
  return <PrivateImage fileUri={uri} className="w-full h-full object-cover" />;
}

const TONES = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
};

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const t = TONES[tone] || TONES.emerald;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${t.bg} ${t.icon} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${t.text}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}