import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Camera as CameraIcon, Maximize2, Play, Square, Camera as SnapIcon,
  Disc, Settings, MapPin, Radio, Brain, Clock, Activity, Cpu, Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import WebRTCPlayer from "@/components/cameras/WebRTCPlayer";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function CameraLive() {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(false);
  const [session, setSession] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [events, setEvents] = useState([]);
  const videoWrapRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Camera.get(id),
      base44.entities.DetectionEvent.filter({ camera_id: id }, "-detected_at", 8),
    ]).then(([cam, evs]) => {
      setCamera(cam);
      setEvents(evs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const startViewing = async () => {
    if (!camera) return;
    setRequesting(true);
    try {
      const res = await base44.functions.invoke("cameraGateway", {
        action: "getStreamToken",
        camera_id: camera.camera_id,
        stream_type: "main",
      });
      if (res.data?.whep_endpoint) {
        setSession(res.data);
        setViewing(true);
      } else {
        toast({ title: res.data?.error || "No stream endpoint returned", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Failed to start stream", description: e.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const stopViewing = () => {
    setViewing(false);
    setSession(null);
  };

  const snapshot = () => {
    const video = videoWrapRef.current?.querySelector("video");
    if (!video) { toast({ title: "No active video to capture", variant: "destructive" }); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = `${camera.camera_id}_snapshot_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Snapshot saved", variant: "success" });
  };

  const toggleFullscreen = () => {
    const el = videoWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live video */}
        <div className="lg:col-span-2">
          <div ref={videoWrapRef} className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
            {viewing && session ? (
              <WebRTCPlayer whepEndpoint={session.whep_endpoint} iceServers={session.ice_servers} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <CameraIcon className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-sm font-medium text-slate-300 mb-1">Live stream not started</p>
                <p className="text-xs text-slate-500 mb-4 text-center px-6">
                  Press Start Viewing to request a WebRTC session from the media gateway.
                </p>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={startViewing} disabled={requesting}>
                  {requesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {requesting ? "Requesting session…" : "Start Viewing"}
                </Button>
              </div>
            )}

            {/* Overlay HUD */}
            {viewing && (
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
                <div className="bg-black/50 backdrop-blur px-2.5 py-1.5 rounded-md">
                  <div className="text-xs text-white font-semibold">{camera.name}</div>
                  <div className="text-[10px] text-slate-300 font-mono">{camera.camera_id}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur px-2 py-1 rounded-md">
                    <span className={`w-2 h-2 rounded-full ${camera.recording_enabled ? "bg-red-500 animate-pulse" : "bg-slate-500"}`} />
                    <span className="text-[10px] text-white">{camera.recording_enabled ? "REC" : "LIVE"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Detection bounding box placeholder */}
            {viewing && ai === "processing" && (
              <div className="absolute inset-x-10 top-1/3 h-24 border-2 border-emerald-400/70 rounded-md pointer-events-none">
                <div className="absolute -top-6 left-0 bg-emerald-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  monkey 0.96
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!viewing ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={startViewing} disabled={requesting}>
                {requesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopViewing}><Square className="w-4 h-4 mr-2" /> Stop</Button>
            )}
            <Button variant="outline" onClick={snapshot} disabled={!viewing}><SnapIcon className="w-4 h-4 mr-2" /> Snapshot</Button>
            <Button variant="outline" onClick={toggleFullscreen} disabled={!viewing}><Maximize2 className="w-4 h-4 mr-2" /> Fullscreen</Button>
            <Button variant="outline" disabled><Disc className="w-4 h-4 mr-2" /> Record</Button>
            <Button variant="outline" disabled><Settings className="w-4 h-4 mr-2" /> PTZ</Button>
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Stream Status</h3>
            <div className="space-y-2 text-sm">
              <Row icon={Radio} label="Stream" value={camera.stream_status || "offline"} />
              <Row icon={Brain} label="AI Status" value={ai} />
              <Row icon={Disc} label="Recording" value={camera.recording_enabled ? "On" : "Off"} />
              <Row icon={Activity} label="FPS" value={camera.fps || "—"} />
              <Row icon={CameraIcon} label="Resolution" value={camera.resolution || "—"} />
              <Row icon={Clock} label="Latency" value={camera.latency_ms ? `${camera.latency_ms}ms` : "—"} />
              <Row icon={Clock} label="Last Detection" value={camera.last_detection_at ? new Date(camera.last_detection_at).toLocaleString() : "—"} />
              <Row icon={Cpu} label="Edge Device" value={camera.edge_device_name || "None"} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Location</h3>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <div className="font-medium text-slate-800">{camera.site_name || "Unassigned"}</div>
                <div className="text-xs text-slate-400">
                  {camera.latitude?.toFixed(5)}, {camera.longitude?.toFixed(5)}
                </div>
                {camera.orientation && <div className="text-xs text-slate-400 mt-1">{camera.orientation}</div>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Recent Detections</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No recent detections.</p>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-medium text-slate-700 capitalize">{e.detection_type}</div>
                      <div className="text-xs text-slate-400">{new Date(e.detected_at || e.created_date).toLocaleString()}</div>
                    </div>
                    <span className="text-xs font-mono text-emerald-600">{Math.round((e.confidence || 0) * 100)}%</span>
                  </div>
                ))}
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
      <span className="text-slate-700 font-medium capitalize">{value}</span>
    </div>
  );
}