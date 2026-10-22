import React from "react";
import { Link } from "react-router-dom";
import { Camera, CircleCheck, CircleHelp, MapPin, Radio, WifiOff } from "lucide-react";

export default function CameraCard({ cam, sites = [], status }) {
  const site = sites.find((item) => String(item.id) === String(cam.site_id));
  const connected = status?.configured && status.state === "configured";
  const live = connected && status.online;
  const badge = status?.media_service_available === false
    ? { label: "Server unavailable", className: "bg-amber-100 text-amber-900", icon: CircleHelp }
    : live
    ? { label: "Live", className: "bg-emerald-100 text-emerald-800", icon: Radio }
    : connected
      ? { label: "Configured · idle", className: "bg-sky-100 text-sky-800", icon: CircleCheck }
      : status?.state === "apply_failed"
        ? { label: "Needs attention", className: "bg-rose-100 text-rose-800", icon: WifiOff }
          : { label: "Setup required", className: "bg-slate-100 text-slate-600", icon: CircleHelp };
  const BadgeIcon = badge.icon;

  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <Link to={`/cameras/${cam.id}`} className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400" aria-label={`View ${cam.name} camera details`}>
      {live ? <Radio className="h-10 w-10 text-emerald-400" /> : <Camera className="h-10 w-10" />}
    </Link>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2"><div><Link to={`/cameras/${cam.id}`} className="font-semibold text-slate-800 hover:text-emerald-700">{cam.name}</Link><p className="mt-1 font-mono text-xs text-slate-500">{cam.camera_id || cam.id}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] ${badge.className}`}><BadgeIcon className="h-3 w-3" />{badge.label}</span></div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{cam.site_name || site?.name || "Site not assigned"}{cam.ward ? ` · Ward ${cam.ward}` : ""}</div>
      <p className="mt-2 text-xs text-slate-500">{cam.brand || "Camera"} {cam.model || ""}{status?.network_label ? ` · ${status.network_label}` : ""}</p>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <Link to={`/cameras/${cam.id}`} className="font-medium text-emerald-700 hover:text-emerald-900">Camera details</Link>
        {connected && <Link to={`/cameras/${cam.id}/live`} className="font-medium text-slate-600 hover:text-slate-900">Open live view</Link>}
      </div>
    </div>
  </article>;
}
