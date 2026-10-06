import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Camera, Plus, Search, Disc, Brain, Wifi, WifiOff,
  LayoutGrid, List, Eye, MapPin, Clock, Video as VideoIcon, AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CameraCard from "@/components/cameras/CameraCard";
import CameraSetupWizard from "@/components/cameras/CameraSetupWizard";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Camera.list("-created_date", 200),
      base44.entities.Site.list(),
    ]).then(([cams, st]) => {
      setCameras(cams);
      setSites(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = cameras.filter((c) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.camera_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.location_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.online_status === filter || (filter === "ai" && c.ai_status === "processing");
    return matchSearch && matchFilter;
  });

  const online = cameras.filter((c) => c.online_status === "online").length;
  const offline = cameras.filter((c) => c.online_status === "offline").length;
  const recording = cameras.filter((c) => c.recording_enabled).length;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const animalDetections = cameras.filter((c) => c.last_detection_at && new Date(c.last_detection_at).getTime() > dayAgo).length;

  const summary = [
    { label: "Total Cameras", value: cameras.length, tone: "bg-slate-50 text-slate-600", icon: Camera },
    { label: "Online", value: online, tone: "bg-emerald-50 text-emerald-600", icon: Wifi },
    { label: "Offline", value: offline, tone: "bg-red-50 text-red-600", icon: WifiOff },
    { label: "Recording", value: recording, tone: "bg-red-50 text-red-600", icon: Disc },
    { label: "Animal Detections", value: animalDetections, tone: "bg-amber-50 text-amber-600", icon: Brain },
  ];

  return (
    <div>
      <PageHeader
        title="Camera Monitoring"
        description="Dahua IP cameras · Camera → Router → Internet → Cloud — no edge device required"
        icon={Camera}
        actions={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Camera
          </Button>
        }
      />

      {/* Dashboard summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cameras..." className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1 flex-wrap">
          {[
            { k: "all", label: "All" },
            { k: "online", label: "🟢 Online" },
            { k: "ai", label: "🔵 AI" },
            { k: "degraded", label: "🟡 Warning" },
            { k: "offline", label: "🔴 Offline" },
          ].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1 ml-auto">
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md ${view === "grid" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView("table")} className={`p-1.5 rounded-md ${view === "table" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`} aria-label="Table view"><List className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Camera} title="No cameras found" description="Add a Dahua IP camera to start real-time wildlife monitoring." action={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setWizardOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Camera</Button>} />
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cam) => (
            <CameraCard key={cam.id} cam={cam} sites={sites} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-4 py-3">Camera</th>
                <th className="text-left font-medium px-4 py-3">Location</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Animal</th>
                <th className="text-left font-medium px-4 py-3">Latency</th>
                <th className="text-left font-medium px-4 py-3">Last Seen</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cam) => {
                const isOffline = cam.online_status === "offline";
                return (
                  <tr key={cam.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{cam.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{cam.camera_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" />{cam.location_name || cam.site_name || "—"}</div>
                      <div className="text-xs text-slate-400">{cam.municipality ? `${cam.municipality}, ${cam.district}` : ""}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={cam.online_status || "offline"} /></td>
                    <td className="px-4 py-3 capitalize text-slate-600">{cam.last_detection_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{cam.latency_ms ? `${cam.latency_ms} ms` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{timeAgo(cam.last_heartbeat)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {isOffline ? (
                          <Link to={`/cameras/${cam.id}`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Diagnose
                          </Link>
                        ) : (
                          <Link to={`/cameras/${cam.id}/live`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" /> View
                          </Link>
                        )}
                        <Link to={`/cameras/${cam.id}`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1">
                          <VideoIcon className="w-3 h-3" /> Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CameraSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} sites={sites} onCreated={load} />
    </div>
  );
}