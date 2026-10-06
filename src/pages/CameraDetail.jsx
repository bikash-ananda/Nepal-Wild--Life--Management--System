import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Camera as CameraIcon, Radio, Brain, Disc, Cpu, MapPin, Clock,
  Activity, Video, Settings, Edit, Loader2, ShieldCheck
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function CameraDetail() {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Camera.get(id),
      base44.entities.DetectionEvent.filter({ camera_id: id }, "-detected_at", 20),
    ]).then(([cam, evs]) => {
      setCamera(cam);
      setEvents(evs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const toggle = async (field, value) => {
    setToggling(field);
    try {
      await base44.entities.Camera.update(camera.id, { [field]: value });
      setCamera({ ...camera, [field]: value });
      toast({ title: `${field.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}`, variant: "success" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!camera) return <div className="text-center py-20 text-slate-500">Camera not found. <Link to="/cameras" className="text-emerald-600">Back to cameras</Link></div>;

  const ai = camera.ai_status || "idle";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to="/cameras" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Cameras
        </Link>
        <div className="flex items-center gap-2">
          {camera.is_demo && <DemoBadge label="DEMO CAMERA" />}
          <StatusBadge status={camera.online_status || "offline"} />
        </div>
      </div>

      <PageHeader
        title={camera.name}
        description={`${camera.brand} ${camera.model} · ${camera.camera_id}`}
        icon={CameraIcon}
        actions={
          <>
            <Link to={`/cameras/${camera.id}/live`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Video className="w-4 h-4 mr-1.5" /> Live View
              </Button>
            </Link>
            <Button variant="outline" disabled><Edit className="w-4 h-4 mr-1.5" /> Edit</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Stream preview placeholder */}
          <div className="bg-slate-900 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
            <Video className="w-12 h-12 text-slate-600" />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur px-2 py-1 rounded-md">
              <Radio className={`w-3 h-3 ${camera.stream_status === "online" ? "text-emerald-400" : "text-red-400"}`} />
              <span className="text-[10px] text-white font-mono">{camera.stream_status || "offline"}</span>
            </div>
            <Link to={`/cameras/${camera.id}/live`} className="absolute bottom-3 right-3">
              <span className="text-xs text-emerald-400 hover:underline">Open live →</span>
            </Link>
          </div>

          {/* Event timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Event Timeline</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No events recorded for this camera yet.</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200" />
                {events.map((e) => (
                  <div key={e.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    <div className="text-xs text-slate-400">{new Date(e.detected_at || e.created_date).toLocaleString()}</div>
                    <div className="text-sm text-slate-700 font-medium capitalize">
                      {e.detection_type} detected — {Math.round((e.confidence || 0) * 100)}%
                    </div>
                    {e.deterrent_triggered && (
                      <div className="text-xs text-amber-600 mt-0.5">⚡ Automation triggered</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Stream & AI</h3>
            <div className="space-y-2 text-sm">
              <Row icon={Radio} label="Stream Status" value={camera.stream_status || "offline"} />
              <Row icon={Activity} label="FPS / Resolution" value={`${camera.fps || "—"} / ${camera.resolution || "—"}`} />
              <Row icon={Clock} label="Latency" value={camera.latency_ms ? `${camera.latency_ms}ms` : "—"} />
              <Row icon={Brain} label="AI Status" value={ai} />
              <Row icon={Activity} label="AI Detection FPS" value={camera.ai_detection_fps || "—"} />
              <Row icon={Disc} label="Recording" value={camera.recording_enabled ? "On" : "Off"} />
              <Row icon={Cpu} label="Edge Device" value={camera.edge_device_name || "None"} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Controls</h3>
            <div className="space-y-3">
              <ControlRow label="AI Detection" checked={!!camera.ai_detection} disabled={toggling === "ai_detection"} onChange={(v) => toggle("ai_detection", v)} />
              <ControlRow label="Recording" checked={!!camera.recording_enabled} disabled={toggling === "recording_enabled"} onChange={(v) => toggle("recording_enabled", v)} />
              <ControlRow label="WebRTC" checked={!!camera.webrtc_enabled} disabled={toggling === "webrtc_enabled"} onChange={(v) => toggle("webrtc_enabled", v)} />
              <ControlRow label="Motion Detection" checked={!!camera.motion_detection} disabled={toggling === "motion_detection"} onChange={(v) => toggle("motion_detection", v)} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Connection</h3>
            <div className="space-y-2 text-sm">
              <Row icon={MapPin} label="Site" value={camera.site_name || "—"} />
              <Row icon={MapPin} label="GPS" value={`${(camera.latitude || 0).toFixed(4)}, ${(camera.longitude || 0).toFixed(4)}`} />
              <Row icon={Settings} label="Codec" value={camera.codec || "—"} />
              <Row icon={Settings} label="ONVIF" value={camera.onvif_support ? "Yes" : "No"} />
              <Row icon={ShieldCheck} label="Gateway Path" value={camera.gateway_stream_id || "auto"} />
              <Row icon={Clock} label="Last Heartbeat" value={camera.last_heartbeat ? new Date(camera.last_heartbeat).toLocaleString() : "—"} />
            </div>
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
      <span className="text-slate-700 font-medium capitalize">{value}</span>
    </div>
  );
}

function ControlRow({ label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-slate-300"} ${disabled ? "opacity-50" : ""}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}