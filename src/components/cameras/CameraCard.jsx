import React from "react";
import { Link } from "react-router-dom";
import { Video, Wifi, WifiOff, Radio, Brain, Disc, Cpu, MapPin, Clock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import { cn } from "@/lib/utils";

const aiStatusMap = {
  idle: { label: "AI Idle", dot: "bg-slate-400" },
  processing: { label: "AI Processing", dot: "bg-blue-500" },
  error: { label: "AI Error", dot: "bg-red-500" },
  disabled: { label: "AI Disabled", dot: "bg-slate-300" },
};

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CameraCard({ cam, sites }) {
  const site = sites.find((s) => s.id === cam.site_id);
  const ai = aiStatusMap[cam.ai_status] || aiStatusMap.idle;
  const streamOnline = cam.stream_status === "online";
  const recording = cam.recording_enabled;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
      <Link to={`/cameras/${cam.id}`} className="block relative aspect-video bg-slate-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-9 h-9 text-slate-600" />
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {cam.is_demo && <DemoBadge />}
          <StatusBadge status={cam.online_status || "offline"} />
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur px-2 py-1 rounded-md">
          {streamOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
          <span className="text-[10px] text-white font-mono">{cam.camera_id?.slice(0, 14)}</span>
        </div>
        {recording && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/80 px-1.5 py-0.5 rounded">
            <Disc className="w-2.5 h-2.5 text-white animate-pulse" />
            <span className="text-[9px] text-white font-bold">REC</span>
          </div>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Link to={`/cameras/${cam.id}`} className="font-semibold text-slate-800 text-sm truncate hover:text-emerald-600">
            {cam.name}
          </Link>
          <Link to={`/cameras/${cam.id}/live`} className="text-[11px] font-medium text-emerald-600 hover:underline">
            Live →
          </Link>
        </div>
        <div className="text-xs text-slate-400 mb-3 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {cam.site_name || site?.name || "Unassigned"}
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Radio className={cn("w-3 h-3", streamOnline ? "text-emerald-500" : "text-slate-300")} />
            <span className="text-slate-400">Stream</span>
            <span className={streamOnline ? "text-emerald-600 font-medium" : "text-slate-500"}>
              {cam.stream_status || "offline"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", ai.dot)} />
            <span className="text-slate-400">AI</span>
            <span className="text-slate-600 font-medium">{ai.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Disc className={cn("w-3 h-3", recording ? "text-red-500" : "text-slate-300")} />
            <span className="text-slate-400">Rec</span>
            <span className={recording ? "text-red-600 font-medium" : "text-slate-500"}>{recording ? "On" : "Off"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Edge</span>
            <span className="text-slate-600 font-medium truncate">{cam.edge_device_name || "—"}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>{cam.resolution || "—"} · {cam.fps || 0} fps</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {cam.latency_ms ? `${cam.latency_ms}ms` : "—"}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          Last detection: {timeAgo(cam.last_detection_at)}
        </div>
      </div>
    </div>
  );
}