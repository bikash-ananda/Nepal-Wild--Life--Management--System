import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Footprints, MapPin, Clock, Users, Target, Play, Square, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function PatrolDetail() {
  const { id } = useParams();
  const [patrol, setPatrol] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    base44.entities.Patrol.get(id).then(setPatrol).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const setStatus = async (status) => {
    try {
      const updates = { status };
      if (status === "active" && !patrol.start_time) updates.start_time = new Date().toISOString();
      if (status === "completed" && !patrol.end_time) {
        updates.end_time = new Date().toISOString();
        if (patrol.start_time) {
          updates.duration_hours = Number(((new Date(updates.end_time) - new Date(patrol.start_time)) / 3600000).toFixed(2));
        }
      }
      await base44.entities.Patrol.update(patrol.id, updates);
      setPatrol({ ...patrol, ...updates });
      toast({ title: `Patrol ${status}`, variant: "success" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!patrol) return <div className="text-center py-20 text-slate-500">Patrol not found. <Link to="/patrols" className="text-emerald-600">Back</Link></div>;

  const route = (patrol.actual_route && patrol.actual_route.length ? patrol.actual_route : patrol.planned_route) || [];
  const center = route[0] || [28.2096, 83.9856];

  return (
    <div>
      <Link to="/patrols" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Patrols
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Footprints className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patrol.name}</h1>
            <div className="text-xs text-slate-400 font-mono">{patrol.patrol_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {patrol.is_demo && <DemoBadge />}
          <StatusBadge status={patrol.status || "planned"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 overflow-hidden">
            <MapContainer center={center} zoom={13} style={{ height: 400, width: "100%" }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {route.length > 1 && (
                <Polyline positions={route} pathOptions={{ color: "#10b981", weight: 4, dashArray: patrol.actual_route?.length ? undefined : "8 8" }} />
              )}
              {route.length > 0 && (
                <Marker position={route[0]}>
                  <Popup>Patrol start</Popup>
                </Marker>
              )}
              {route.length > 1 && (
                <Marker position={route[route.length - 1]}>
                  <Popup>Patrol end / latest</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {patrol.objectives && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Objectives</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{patrol.objectives}</p>
            </div>
          )}
          {patrol.notes && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-2">Patrol Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{patrol.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Patrol Controls</h3>
            <div className="flex flex-col gap-2">
              {patrol.status === "planned" && (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus("active")}><Play className="w-4 h-4 mr-2" /> Start Patrol</Button>
              )}
              {patrol.status === "active" && (
                <Button variant="destructive" onClick={() => setStatus("completed")}><Square className="w-4 h-4 mr-2" /> End Patrol</Button>
              )}
              {patrol.status === "completed" && (
                <p className="text-sm text-slate-500 text-center py-2">Patrol completed</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <Row icon={MapPin} label="Sector" value={patrol.sector || "—"} />
              <Row icon={MapPin} label="Protected Area" value={patrol.park_name || "—"} />
              <Row icon={Users} label="Rangers" value={`${patrol.assigned_rangers?.length || 0} assigned`} />
              <Row icon={Clock} label="Started" value={patrol.start_time ? new Date(patrol.start_time).toLocaleString() : "Not started"} />
              <Row icon={Clock} label="Ended" value={patrol.end_time ? new Date(patrol.end_time).toLocaleString() : "—"} />
              <Row icon={Target} label="Distance" value={patrol.distance_km ? `${patrol.distance_km} km` : "—"} />
              <Row icon={Clock} label="Duration" value={patrol.duration_hours ? `${patrol.duration_hours} hrs` : "—"} />
              <Row icon={Target} label="Incidents" value={patrol.incidents_discovered || 0} />
              <Row icon={Target} label="Sightings" value={patrol.sightings_count || 0} />
            </div>
            {patrol.assigned_rangers?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-1.5">Assigned Rangers</div>
                <div className="flex flex-wrap gap-1.5">
                  {patrol.assigned_rangers.map((r, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400"><Icon className="w-3.5 h-3.5" /> {label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}