import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Route, Footprints, MapPin, Calendar, Ruler, Clock, Filter, Loader2, Eye, EyeOff, Fingerprint } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

const TRACK_PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#14b8a6",
  "#3b82f6", "#d946ef",
];

const selectClass =
  "px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400";

function haversineKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function MovementMap() {
  const [loading, setLoading] = useState(true);
  const [individuals, setIndividuals] = useState([]);
  const [detections, setDetections] = useState([]);
  const [observations, setObservations] = useState([]);

  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [hiddenIds, setHiddenIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [indRes, detRes, obsRes] = await Promise.all([
          api.entities.AnimalIndividual.filter({ active: true }, { sort: "-last_seen_at", limit: 100 }),
          api.entities.DetectionEvent.filter({ individual_id: { $ne: null } }, { sort: "-detected_at", limit: 200 }),
          api.entities.WildlifeObservation.filter({ individual_id: { $ne: null } }, { sort: "-observed_at", limit: 200 }),
        ]);
        setIndividuals(indRes.items || indRes || []);
        setDetections(detRes.items || detRes || []);
        setObservations(obsRes.items || obsRes || []);
      } catch {
        setIndividuals([]);
        setDetections([]);
        setObservations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const indById = useMemo(() => new Map(individuals.map((i) => [i.id, i])), [individuals]);

  // Unified, chronologically-sorted sighting points with individual + coords
  const allPoints = useMemo(() => {
    const det = detections
      .filter((d) => d.latitude && d.longitude)
      .map((d) => ({
        id: d.id,
        individualId: d.individual_id,
        lat: d.latitude,
        lng: d.longitude,
        date: d.detected_at || d.created_date,
        location: d.site_name,
        kind: "detection",
      }));
    const obs = observations
      .filter((o) => o.latitude && o.longitude)
      .map((o) => ({
        id: o.id,
        individualId: o.individual_id,
        lat: o.latitude,
        lng: o.longitude,
        date: o.observed_at || o.created_date,
        location: o.location_name || o.province,
        kind: "observation",
      }));
    return [...det, ...obs].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [detections, observations]);

  // Species options from tracked individuals
  const speciesOptions = useMemo(() => {
    const set = new Set();
    allPoints.forEach((p) => {
      const ind = indById.get(p.individualId);
      if (ind?.species_name) set.add(ind.species_name);
    });
    return [...set].sort();
  }, [allPoints, indById]);

  // Per-individual tracks, filtered by species + visibility
  const tracks = useMemo(() => {
    const byInd = new Map();
    allPoints.forEach((p) => {
      const ind = indById.get(p.individualId);
      if (!ind) return;
      if (speciesFilter !== "all" && ind.species_name !== speciesFilter) return;
      if (!byInd.has(p.individualId)) byInd.set(p.individualId, []);
      byInd.get(p.individualId).push(p);
    });

    return [...byInd.entries()].map(([id, pts], idx) => {
      const ind = indById.get(id);
      const sorted = pts.slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      const positions = sorted.map((p) => [p.lat, p.lng]);
      const distanceKm = positions.reduce((sum, p, i) => (i === 0 ? 0 : sum + haversineKm(positions[i - 1], p)), 0);
      const dates = sorted.map((s) => new Date(s.date).getTime()).filter(Boolean);
      return {
        id,
        individual: ind,
        color: TRACK_PALETTE[idx % TRACK_PALETTE.length],
        points: sorted,
        positions,
        distanceKm: Math.round(distanceKm * 10) / 10,
        firstAt: dates.length ? dates[0] : null,
        lastAt: dates.length ? dates[dates.length - 1] : null,
        spanDays: dates.length > 1 ? Math.round((dates[dates.length - 1] - dates[0]) / 86400000) : 0,
      };
    }).sort((a, b) => b.points.length - a.points.length);
  }, [allPoints, indById, speciesFilter]);

  const visibleTracks = useMemo(() => tracks.filter((t) => !hiddenIds.has(t.id)), [tracks, hiddenIds]);

  const visiblePoints = useMemo(
    () => visibleTracks.flatMap((t) => t.points.map((p) => [p.lat, p.lng])),
    [visibleTracks]
  );

  const stats = useMemo(() => {
    const totalPoints = allPoints.length;
    const totalDistance = tracks.reduce((s, t) => s + t.distanceKm, 0);
    const allDates = allPoints.map((p) => new Date(p.date).getTime()).filter(Boolean);
    const first = allDates.length ? Math.min(...allDates) : null;
    const last = allDates.length ? Math.max(...allDates) : null;
    return {
      individuals: tracks.length,
      totalPoints,
      totalDistance: Math.round(totalDistance * 10) / 10,
      spanDays: first && last ? Math.round((last - first) / 86400000) : 0,
    };
  }, [allPoints, tracks]);

  const toggleHidden = (id) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mapCenter = visiblePoints.length ? visiblePoints[0] : [27.7, 85.3];

  return (
    <div>
      <PageHeader
        title="Movement Map"
        description="Historical movement paths of individually-identified animals across regions, built from collected coordinate data."
        icon={Route}
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="sm:w-60">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {speciesOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tracks.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setHiddenIds(new Set())}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Show all
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setHiddenIds(new Set(tracks.map((t) => t.id)))}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Hide all
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Route}
            title="No movement data yet"
            description="Once sightings are matched to identified individuals with coordinates, their movement paths will appear here."
            action={
              <Link to="/sighting-history" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Go to Sighting History →
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile icon={Fingerprint} label="Individuals tracked" value={stats.individuals} tone="emerald" />
            <StatTile icon={MapPin} label="Geocoded points" value={stats.totalPoints} tone="blue" />
            <StatTile icon={Ruler} label="Total distance" value={`${stats.totalDistance} km`} sub="summed track length" tone="violet" />
            <StatTile icon={Calendar} label="Tracking span" value={stats.spanDays ? `${stats.spanDays}d` : "—"} sub="first to last sighting" tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Route className="w-4 h-4 text-emerald-600" /> Movement tracks
                </h3>
                <span className="text-xs text-slate-400">{visibleTracks.length} of {tracks.length} individuals shown</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 480 }}>
                <MapContainer
                  center={mapCenter}
                  zoom={8}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                  zoomControl={false}
                  whenCreated={(map) => {
                    if (visiblePoints.length) {
                      const bounds = window.L?.latLngBounds(visiblePoints.map((p) => window.L.latLng(p[0], p[1])));
                      if (bounds && bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: 12 });
                    }
                  }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                  <ZoomControl position="bottomright" />

                  {visibleTracks.map((t) => (
                    <React.Fragment key={t.id}>
                      {t.positions.length > 1 && (
                        <Polyline
                          positions={t.positions}
                          pathOptions={{ color: t.color, weight: 3, opacity: 0.75, dashArray: "6,7" }}
                        />
                      )}
                      {t.points.map((p, i) => (
                        <CircleMarker
                          key={`${t.id}-${i}`}
                          center={[p.lat, p.lng]}
                          radius={i === 0 ? 7 : i === t.points.length - 1 ? 7 : 5}
                          pathOptions={{
                            color: t.color,
                            fillColor: i === 0 ? t.color : "#ffffff",
                            fillOpacity: i === 0 ? 0.95 : 0.9,
                            weight: 2,
                          }}
                        >
                          <Tooltip>
                            <div className="text-xs">
                              <div className="font-semibold">{t.individual?.nickname || t.individual?.individual_code || "Individual"}</div>
                              <div>{t.individual?.species_name || ""}</div>
                              <div className="text-slate-500">{p.location || "—"}</div>
                              <div className="text-slate-400">
                                {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                                {p.date ? ` · ${new Date(p.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </div>
                              <div className="text-slate-400 capitalize">{i === 0 ? "● first sighting" : i === t.points.length - 1 ? "● last sighting" : `point ${i + 1}`}</div>
                            </div>
                          </Tooltip>
                        </CircleMarker>
                      ))}
                    </React.Fragment>
                  ))}
                </MapContainer>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Route className="w-3 h-3" /> Dashed lines connect chronological sightings per individual. Filled dots = first sighting; ringed dots = subsequent.
              </p>
            </div>

            {/* Legend / individual list */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-emerald-600" /> Tracked individuals
              </h3>
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {tracks.map((t) => {
                  const hidden = hiddenIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-xl border p-3 transition-colors",
                        hidden ? "border-slate-100 bg-slate-50/50 opacity-60" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleHidden(t.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {t.individual?.nickname || t.individual?.individual_code || "Unknown"}
                          </span>
                        </button>
                        <button
                          onClick={() => toggleHidden(t.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title={hidden ? "Show" : "Hide"}
                        >
                          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-1.5 pl-5 text-[11px] text-slate-500 space-y-0.5">
                        <div>{t.individual?.species_name || "—"}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.points.length} pts</span>
                          <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> {t.distanceKm} km</span>
                          {t.spanDays > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.spanDays}d</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", t.bg, t.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold", t.text)}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}