import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Camera, Activity, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

// Fix default marker icons for leaflet in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const statusColors = {
  active: "#10b981",
  inactive: "#94a3b8",
  maintenance: "#f59e0b",
};

function siteIcon(color) {
  return L.divIcon({
    className: "custom-site-marker",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
}

export default function MapView() {
  const [sites, setSites] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Site.list(),
      base44.entities.Camera.list(),
      base44.entities.Sensor.list(),
      base44.entities.DetectionEvent.list("-detected_at", 50),
    ]).then(([s, c, sen, e]) => {
      setSites(s); setCameras(c); setSensors(sen); setEvents(e);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const geoSites = sites.filter(s => s.latitude != null && s.longitude != null);

  const siteStats = (siteId) => {
    const cams = cameras.filter(c => c.site_id === siteId);
    const sens = sensors.filter(s => s.site_id === siteId);
    const evs = events.filter(e => e.site_id === siteId);
    return {
      cameras: cams.length,
      onlineCameras: cams.filter(c => c.online_status === "online").length,
      sensors: sens.length,
      detections: evs.length,
      recentDetections: evs.slice(0, 3),
    };
  };

  // Center on Nepal by default
  const center = geoSites.length > 0
    ? [geoSites[0].latitude, geoSites[0].longitude]
    : [28.3949, 84.1240];

  return (
    <div>
      <PageHeader
        title="Site Map"
        description="Geographic overview of all deployment sites and device activity"
        icon={MapPin}
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : geoSites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={MapPin} title="No geolocated sites" description="Add GPS coordinates to your sites to see them on the map." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div style={{ height: "600px" }} className="w-full">
              <MapContainer center={center} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {geoSites.map(site => {
                  const color = statusColors[site.status] || statusColors.active;
                  const stats = siteStats(site.id);
                  return (
                    <Marker
                      key={site.id}
                      position={[site.latitude, site.longitude]}
                      icon={siteIcon(color)}
                      eventHandlers={{ click: () => setSelected(site.id) }}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <div className="font-semibold text-slate-800 text-sm">{site.name}</div>
                          {site.code && <div className="text-xs text-slate-400 font-mono mb-2">{site.code}</div>}
                          <div className="space-y-1 text-xs text-slate-600">
                            <div className="flex justify-between gap-4"><span>Cameras</span><span className="font-medium">{stats.onlineCameras}/{stats.cameras} online</span></div>
                            <div className="flex justify-between gap-4"><span>Sensors</span><span className="font-medium">{stats.sensors}</span></div>
                            <div className="flex justify-between gap-4"><span>Detections</span><span className="font-medium">{stats.detections}</span></div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {geoSites.map(site => (
                  <Circle
                    key={`circle-${site.id}`}
                    center={[site.latitude, site.longitude]}
                    radius={site.geofence_radius_m || 100}
                    pathOptions={{ color: statusColors[site.status] || statusColors.active, fillColor: statusColors[site.status] || statusColors.active, fillOpacity: 0.08, weight: 1 }}
                  />
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Legend</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Active site</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> Maintenance</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-400" /> Inactive</div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1"><span className="w-3 h-3 rounded-full border border-emerald-500 bg-emerald-500/10" /> Geofence radius</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Sites ({geoSites.length})</h3>
              <div className="space-y-2 max-h-[440px] overflow-y-auto">
                {geoSites.map(site => {
                  const stats = siteStats(site.id);
                  const isSelected = selected === site.id;
                  return (
                    <button
                      key={site.id}
                      onClick={() => setSelected(site.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-100 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-slate-800 text-sm truncate">{site.name}</div>
                        <StatusBadge status={site.status || "active"} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {stats.cameras}</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {stats.sensors}</span>
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {stats.detections}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">{site.latitude?.toFixed(4)}, {site.longitude?.toFixed(4)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}