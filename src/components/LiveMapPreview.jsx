import React from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Map as MapIcon, Maximize2 } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function siteIcon(color) {
  return L.divIcon({
    className: "custom-site-marker",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    popupAnchor: [0, -16],
  });
}

function detectionIcon() {
  return L.divIcon({
    className: "custom-detection-marker",
    html: `<div style="background:hsl(var(--destructive));width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 3px rgba(239,68,68,0.3);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const statusColors = {
  active: "hsl(var(--accent))",
  inactive: "hsl(var(--muted))",
  maintenance: "hsl(var(--accent))",
};

export default function LiveMapPreview({ sites = [], detections = [], alerts = [] }) {
  const sitesWithCoords = sites.filter((s) => s.latitude && s.longitude);
  const alertSiteIds = new Set(alerts.map((a) => a.site_id).filter(Boolean));

  let center = [27.7172, 85.324];
  if (sitesWithCoords.length > 0) {
    const avgLat = sitesWithCoords.reduce((s, site) => s + site.latitude, 0) / sitesWithCoords.length;
    const avgLng = sitesWithCoords.reduce((s, site) => s + site.longitude, 0) / sitesWithCoords.length;
    center = [avgLat, avgLng];
  }

  const recentDetections = detections.filter((d) => d.latitude && d.longitude).slice(0, 20);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Live Monitoring Map</h3>
        </div>
        <Link to="/map" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Maximize2 className="w-3.5 h-3.5" /> Full Map
        </Link>
      </div>
      <div className="relative" style={{ height: 300 }}>
        <MapContainer
          center={center}
          zoom={sitesWithCoords.length > 1 ? 8 : 10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {sitesWithCoords.map((site) => {
            const hasAlert = alertSiteIds.has(site.id);
            const color = hasAlert ? "hsl(var(--destructive))" : statusColors[site.status] || statusColors.active;
            return (
              <Marker key={site.id} position={[site.latitude, site.longitude]} icon={siteIcon(color)}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{site.name}</div>
                    <div className="text-slate-500">{site.address || "No address"}</div>
                    {hasAlert && <div className="text-red-600 font-medium mt-1">Active Alert</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {sitesWithCoords.map((site) => (
            <Circle
              key={`circle-${site.id}`}
              center={[site.latitude, site.longitude]}
              radius={site.geofence_radius_m || 100}
              pathOptions={{ color: statusColors[site.status] || "hsl(var(--accent))", fillColor: "hsl(var(--accent))", fillOpacity: 0.05, weight: 1 }}
            />
          ))}
          {recentDetections.map((det) => (
            <Marker key={`det-${det.id}`} position={[det.latitude, det.longitude]} icon={detectionIcon()}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold capitalize">{det.detection_type}</div>
                  <div className="text-slate-500">{det.site_name || "Unknown"}</div>
                  <div className="text-slate-400">{det.detected_at ? new Date(det.detected_at).toLocaleString() : ""}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {sitesWithCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 pointer-events-none">
            <div className="text-center">
              <MapIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No site coordinates available</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Alert
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Maintenance
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Inactive
        </div>
      </div>
    </div>
  );
}