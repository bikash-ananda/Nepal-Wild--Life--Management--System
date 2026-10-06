import React, { useState } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Map as MapIcon, Eye, AlertTriangle, Maximize2, Layers } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SITE_COLOR = "hsl(var(--muted))";

function siteIcon() {
  return L.divIcon({
    className: "custom-site-marker",
    html: `<div style="background:${SITE_COLOR};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);opacity:0.7;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const observationColor = "hsl(var(--accent))";

function observationIcon(species) {
  const emoji = species?.toLowerCase()?.includes("leopard")
    ? "🐆"
    : species?.toLowerCase()?.includes("elephant")
    ? "🐘"
    : species?.toLowerCase()?.includes("bear")
    ? "🐻"
    : species?.toLowerCase()?.includes("boar")
    ? "🐗"
    : species?.toLowerCase()?.includes("monkey")
    ? "🐒"
    : "🐾";
  return L.divIcon({
    className: "custom-obs-marker",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:hsl(var(--background));border:2px solid ${observationColor};box-shadow:0 2px 6px rgba(16,185,129,0.4);font-size:14px;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const urgencyColor = {
  critical: "hsl(var(--destructive))",
  high: "hsl(var(--accent))",
  medium: "hsl(var(--accent))",
  low: "hsl(var(--accent))",
};

function incidentIcon(urgency) {
  const color = urgencyColor[urgency] || "hsl(var(--destructive))";
  return L.divIcon({
    className: "custom-incident-marker",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:30px;height:30px;">
      <span style="position:absolute;width:30px;height:30px;border-radius:50%;background:${color};opacity:0.25;animation:pulse-soft 2s infinite;"></span>
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);color:white;font-size:11px;font-weight:700;">!</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ObservationIncidentMap({ sites = [], observations = [], incidents = [] }) {
  const [showObservations, setShowObservations] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  const sitesWithCoords = sites.filter((s) => s.latitude && s.longitude);
  const obsWithCoords = observations.filter((o) => o.latitude && o.longitude);
  const incsWithCoords = incidents.filter((i) => i.latitude && i.longitude);

  let center = [28.2096, 83.9856]; // Kaski / Pokhara region fallback
  if (sitesWithCoords.length > 0) {
    const avgLat = sitesWithCoords.reduce((s, site) => s + site.latitude, 0) / sitesWithCoords.length;
    const avgLng = sitesWithCoords.reduce((s, site) => s + site.longitude, 0) / sitesWithCoords.length;
    center = [avgLat, avgLng];
  } else if (obsWithCoords.length > 0) {
    const avgLat = obsWithCoords.reduce((s, o) => s + o.latitude, 0) / obsWithCoords.length;
    const avgLng = obsWithCoords.reduce((s, o) => s + o.longitude, 0) / obsWithCoords.length;
    center = [avgLat, avgLng];
  } else if (incsWithCoords.length > 0) {
    const avgLat = incsWithCoords.reduce((s, i) => s + i.latitude, 0) / incsWithCoords.length;
    const avgLng = incsWithCoords.reduce((s, i) => s + i.longitude, 0) / incsWithCoords.length;
    center = [avgLat, avgLng];
  }

  const hasAny = sitesWithCoords.length || obsWithCoords.length || incsWithCoords.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-slate-800">Field Activity Map</h3>
            <p className="text-xs text-slate-400">Recent wildlife observations & active HWC incidents</p>
          </div>
        </div>
        <Link to="/map" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Maximize2 className="w-3.5 h-3.5" /> Full Map
        </Link>
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex-wrap">
        <Layers className="w-3.5 h-3.5 text-slate-400" />
        <button
          onClick={() => setShowObservations((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            showObservations ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Observations ({obsWithCoords.length})
        </button>
        <button
          onClick={() => setShowIncidents((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            showIncidents ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-400 border-slate-200"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500" />
          HWC Incidents ({incsWithCoords.length})
        </button>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Sites ({sitesWithCoords.length})
        </span>
      </div>

      <div className="relative" style={{ height: 360 }}>
        <MapContainer
          center={center}
          zoom={9}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ZoomControl position="bottomright" />

          {/* Site geofences & markers as context */}
          {sitesWithCoords.map((site) => (
            <Circle
              key={`gf-${site.id}`}
              center={[site.latitude, site.longitude]}
              radius={site.geofence_radius_m || 150}
              pathOptions={{ color: SITE_COLOR, fillColor: SITE_COLOR, fillOpacity: 0.04, weight: 1, dashArray: "4 4" }}
            />
          ))}
          {sitesWithCoords.map((site) => (
            <Marker key={`s-${site.id}`} position={[site.latitude, site.longitude]} icon={siteIcon()}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">{site.name}</div>
                  <div className="text-slate-500">{site.address || site.region || "—"}</div>
                  <div className="text-xs text-slate-400 mt-1">Monitoring site</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Wildlife observations */}
          {showObservations &&
            obsWithCoords.map((o) => (
              <Marker key={`o-${o.id}`} position={[o.latitude, o.longitude]} icon={observationIcon(o.species || o.species_name)}>
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{o.species || o.species_name || "Wildlife"}</span>
                    </div>
                    <div className="text-slate-600">Count: <span className="font-medium">{o.count || 1}</span></div>
                    {o.location_name && <div className="text-slate-500">{o.location_name}</div>}
                    {o.behavior && <div className="text-slate-500 capitalize">Behavior: {o.behavior}</div>}
                    <div className="text-xs text-slate-400 mt-1">{timeAgo(o.observed_at)} · {o.observer_name || "Field team"}</div>
                    <Link to="/sightings" className="inline-flex mt-2 text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                      View sightings →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Active HWC incidents */}
          {showIncidents &&
            incsWithCoords.map((i) => (
              <Marker key={`i-${i.id}`} position={[i.latitude, i.longitude]} icon={incidentIcon(i.urgency)}>
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span className="font-semibold text-slate-800 capitalize">
                        {i.conflict_type?.replace(/_/g, " ") || "HWC Case"}
                      </span>
                    </div>
                    {i.species && <div className="text-slate-600">Species: <span className="font-medium">{i.species}</span></div>}
                    {i.location_name && <div className="text-slate-500">{i.location_name}</div>}
                    {i.estimated_damage && <div className="text-slate-500">Damage: NPR {i.estimated_damage}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs capitalize px-2 py-0.5 rounded-full font-medium" style={{ background: `${urgencyColor[i.urgency] || "hsl(var(--destructive))"}20`, color: urgencyColor[i.urgency] || "hsl(var(--destructive))" }}>
                        {i.urgency} urgency
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{i.status?.replace(/_/g, " ")}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{timeAgo(i.occurred_at)}</div>
                    <Link to={`/hwc/${i.id}`} className="inline-flex mt-2 text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                      Open case →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {!hasAny && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 pointer-events-none">
            <div className="text-center">
              <MapIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No location data available</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Observation
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical Incident
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium/Low
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 opacity-70" /> Site
        </div>
      </div>
    </div>
  );
}