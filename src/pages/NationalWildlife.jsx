import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Globe2, PawPrint, Fingerprint, MapPin, Route, Activity, ArrowRight, Footprints,
} from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import { FadeIn } from "@/components/motion/MotionKit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function NationalWildlife() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ observations: 0, individuals: 0, species: 0, regions: 0 });
  const [regionRows, setRegionRows] = useState([]);
  const [speciesRows, setSpeciesRows] = useState([]);
  const [geoObs, setGeoObs] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [selectedInd, setSelectedInd] = useState("all");
  const [indSightings, setIndSightings] = useState([]);
  const [indLoading, setIndLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [obsCount, indCount, regAgg, spAgg, geoPage, indPage] = await Promise.all([
          api.entities.WildlifeObservation.count({}),
          api.entities.AnimalIndividual.count({ active: true }),
          api.entities.WildlifeObservation.aggregate({
            groupBy: "location_name", sum: ["count"], sort: "-sum_count", limit: 50,
          }),
          api.entities.WildlifeObservation.aggregate({
            groupBy: "species_name", sum: ["count"], sort: "-sum_count", limit: 50,
          }),
          api.entities.WildlifeObservation.filter(
            { latitude: { $ne: null } },
            { sort: "-observed_at", limit: 200, fields: ["latitude", "longitude", "species_name", "location_name", "count", "observed_at"] }
          ),
          api.entities.AnimalIndividual.filter({ active: true }, { sort: "-last_seen_at", limit: 200 }),
        ]);
        const regItems = regAgg.rows || [];
        const spItems = spAgg.rows || [];
        setStats({
          observations: obsCount || 0,
          individuals: indCount || 0,
          species: spItems.length,
          regions: regItems.length,
        });
        setRegionRows(regItems.filter((r) => r.location_name));
        setSpeciesRows(spItems.filter((r) => r.species_name));
        setGeoObs((geoPage.items || geoPage || []).filter((o) => o.latitude && o.longitude));
        setIndividuals(indPage.items || indPage || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedInd === "all") {
      setIndSightings([]);
      return;
    }
    setIndLoading(true);
    Promise.all([
      api.entities.WildlifeObservation.filter(
        { individual_id: selectedInd },
        { sort: "-observed_at", limit: 100, fields: ["latitude", "longitude", "location_name", "observed_at"] }
      ),
      api.entities.DetectionEvent.filter(
        { individual_id: selectedInd },
        { sort: "-detected_at", limit: 100, fields: ["latitude", "longitude", "site_name", "detected_at"] }
      ),
    ])
      .then(([o, d]) => {
        const obs = (o.items || o || []).map((x) => ({
          lat: x.latitude, lng: x.longitude, date: x.observed_at, loc: x.location_name,
        }));
        const det = (d.items || d || []).map((x) => ({
          lat: x.latitude, lng: x.longitude, date: x.detected_at, loc: x.site_name,
        }));
        setIndSightings(
          [...obs, ...det]
            .filter((s) => s.lat && s.lng)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        );
      })
      .catch(() => setIndSightings([]))
      .finally(() => setIndLoading(false));
  }, [selectedInd]);

  const track = useMemo(() => {
    if (selectedInd === "all") return [];
    return indSightings
      .map((s) => ({ ...s, t: new Date(s.date).getTime() }))
      .sort((a, b) => a.t - b.t)
      .map((s) => [s.lat, s.lng]);
  }, [indSightings, selectedInd]);

  const popCenter = geoObs.length ? [geoObs[0].latitude, geoObs[0].longitude] : [27.7, 85.3];
  const moveCenter = indSightings.length ? [indSightings[0].lat, indSightings[0].lng] : popCenter;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="National Wildlife Network"
        description="Citizen-science + ranger sightings unified — animal movement across regions and population counts nationwide."
        icon={Globe2}
        actions={
          <Link
            to="/public-capture"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <PawPrint className="w-4 h-4" /> Public Portal
          </Link>
        }
      />

      {/* Stats */}
      <FadeIn className="mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={Activity} label="Total observations" value={stats.observations} tone="emerald" />
          <StatTile icon={Fingerprint} label="Individuals tracked" value={stats.individuals} tone="blue" />
          <StatTile icon={PawPrint} label="Species observed" value={stats.species} tone="violet" />
          <StatTile icon={MapPin} label="Regions covered" value={stats.regions} tone="amber" />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Regional population */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Regional population (by area)
          </h3>
          {regionRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No regional data yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {regionRows.slice(0, 25).map((r, i) => {
                const max = regionRows[0].sum_count || 1;
                const pct = Math.round(((r.sum_count || 0) / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 truncate text-sm text-slate-600">{r.location_name}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm font-semibold text-slate-700">
                      {r.sum_count || 0}
                      <span className="text-[10px] font-normal text-slate-400 ml-1">animals</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Species breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PawPrint className="w-4 h-4 text-emerald-600" /> Species breakdown
          </h3>
          {speciesRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No species data yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {speciesRows.slice(0, 25).map((r, i) => {
                const max = speciesRows[0].sum_count || 1;
                const pct = Math.round(((r.sum_count || 0) / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-36 truncate text-sm text-slate-600 capitalize">{r.species_name}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm font-semibold text-slate-700">
                      {r.sum_count || 0}
                      <span className="text-[10px] font-normal text-slate-400 ml-1">animals</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Population map */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" /> Sighting density map
        </h3>
        {geoObs.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400 text-center px-4">
            No geocoded observations yet. Public and ranger submissions with GPS will appear here.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-slate-200 h-80">
            <MapContainer center={popCenter} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              {geoObs.map((o, i) => (
                <CircleMarker
                  key={i}
                  center={[o.latitude, o.longitude]}
                  radius={Math.min(4 + (o.count || 1) * 1.5, 14)}
                  pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.55, weight: 1 }}
                >
                  <Tooltip>
                    {o.species_name || "Unknown"} · {o.location_name || "—"}
                    {o.count ? ` (${o.count})` : ""}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Individual movement */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-600" /> Cross-region movement
          </h3>
          <Select value={selectedInd} onValueChange={setSelectedInd}>
            <SelectTrigger className="sm:w-80">
              <SelectValue placeholder="Choose an individual" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All individuals (density only)</SelectItem>
              {individuals.map((ind) => (
                <SelectItem key={ind.id} value={ind.id}>
                  {ind.nickname || ind.individual_code} · {ind.species_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedInd !== "all" && (
            <Link
              to={`/individuals/${selectedInd}`}
              className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1 sm:ml-auto"
            >
              Open profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {selectedInd === "all" ? (
          <div className="h-72 flex items-center justify-center text-center px-4">
            <div>
              <Footprints className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                Select an individual to trace its movement across regions over time.
              </p>
            </div>
          </div>
        ) : indLoading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : indSightings.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400 text-center px-4">
            No geocoded re-sightings for this individual yet.
          </div>
        ) : (
          <>
            <div className="rounded-xl overflow-hidden border border-slate-200 h-80 mb-3">
              <MapContainer center={moveCenter} zoom={8} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {track.length > 1 && (
                  <Polyline positions={track} pathOptions={{ color: "#10b981", weight: 2.5, dashArray: "5,6", opacity: 0.8 }} />
                )}
                {indSightings.map((s, i) => (
                  <CircleMarker
                    key={i}
                    center={[s.lat, s.lng]}
                    radius={i === 0 ? 9 : 6}
                    pathOptions={{
                      color: i === 0 ? "#059669" : "#10b981",
                      fillColor: i === 0 ? "#059669" : "#10b981",
                      fillOpacity: i === 0 ? 0.9 : 0.6,
                    }}
                  >
                    <Tooltip>
                      {s.loc || `Sighting ${indSightings.length - i}`}
                      {s.date ? ` · ${new Date(s.date).toLocaleDateString()}` : ""}
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Route className="w-3 h-3" />
              Dashed line shows chronological movement across {indSightings.length} sighting{indSightings.length === 1 ? "" : "s"}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const TONES = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
};

function StatTile({ icon: Icon, label, value, tone }) {
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
    </div>
  );
}