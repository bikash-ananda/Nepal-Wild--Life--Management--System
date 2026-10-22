import React from "react";
import { MoreVertical, Pencil, Trash2, FileText, Download, MapPin, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeviceTypeIcon, { getCategoryColor } from "./DeviceTypeIcon";

export default function DeviceCard({ device, onAction, onEdit }) {
  const color = getCategoryColor(device.category);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => onAction("view", device)}>
        <DeviceTypeIcon type={device.device_type} category={device.category} />
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{device.name}</span><span className="block truncate font-mono text-[10px] text-slate-400">{device.device_uuid || device.id}</span></span>
      </button>
      <DropdownMenu><DropdownMenuTrigger asChild><button className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Device inventory actions"><MoreVertical className="h-4 w-4 text-slate-400" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onAction("view", device)}><Activity className="mr-2 h-4 w-4" /> View details</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(device)}><Pencil className="mr-2 h-4 w-4" /> Edit record</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("move", device)}><MapPin className="mr-2 h-4 w-4" /> Change site</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("logs", device)}><FileText className="mr-2 h-4 w-4" /> View record history</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("export", device)}><Download className="mr-2 h-4 w-4" /> Export metadata</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600" onClick={() => onAction("remove", device)}><Trash2 className="mr-2 h-4 w-4" /> Remove record</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">Inventory only</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${color.bg} ${color.text}`}>{device.device_type}</span></div>
    {device.site_name && <div className="text-xs text-slate-500">Site: {device.site_name}</div>}
    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-900">No connection, sensor telemetry, power switching, or actuator control is active.</p>
  </article>;
}
