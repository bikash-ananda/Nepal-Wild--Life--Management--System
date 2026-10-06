import React from "react";
import { MoreVertical, Pencil, Trash2, Power, RefreshCw, Download, Activity, FileText, TestTube, MapPin, Edit3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeviceTypeIcon, { statusConfig, getCategoryColor } from "./DeviceTypeIcon";

export default function DeviceCard({ device, onAction, onEdit }) {
  const status = statusConfig[device.status] || statusConfig.online;
  const color = getCategoryColor(device.category);

  const metrics = [];
  if (device.battery_level != null && device.battery_level < 100) metrics.push({ label: "Battery", value: `${device.battery_level}%` });
  if (device.cpu_usage != null && device.cpu_usage > 0) metrics.push({ label: "CPU", value: `${device.cpu_usage}%` });
  if (device.temperature_c != null && device.temperature_c > 0) metrics.push({ label: "Temp", value: `${device.temperature_c}°C` });
  if (device.signal_strength != null && device.signal_strength < 100) metrics.push({ label: "Signal", value: `${device.signal_strength}%` });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onAction("view", device)}>
          <DeviceTypeIcon type={device.device_type} category={device.category} />
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 text-sm truncate">{device.name}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{device.device_uuid || device.id}</div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAction("view", device)}><Activity className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(device)}><Pencil className="w-4 h-4 mr-2" /> Edit Device</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("rename", device)}><Edit3 className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("move", device)}><MapPin className="w-4 h-4 mr-2" /> Move to Project</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("toggle", device)}><Power className="w-4 h-4 mr-2" /> {device.enabled ? "Disable" : "Enable"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("restart", device)}><RefreshCw className="w-4 h-4 mr-2" /> Restart</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("firmware", device)}><Download className="w-4 h-4 mr-2" /> Update Firmware</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("health", device)}><Activity className="w-4 h-4 mr-2" /> Check Health</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("test", device)}><TestTube className="w-4 h-4 mr-2" /> Test Device</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("logs", device)}><FileText className="w-4 h-4 mr-2" /> View Logs</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("export", device)}><Download className="w-4 h-4 mr-2" /> Export Info</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onAction("remove", device)}><Trash2 className="w-4 h-4 mr-2" /> Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>{device.device_type}</span>
        {device.protocol && <span className="text-[10px] text-slate-400">{device.protocol}</span>}
      </div>
      {device.site_name && <div className="text-xs text-slate-500 mb-2">📍 {device.site_name}</div>}
      {metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-50">
          {metrics.map(m => <span key={m.label}><span className="text-slate-400">{m.label}:</span> {m.value}</span>)}
        </div>
      )}
    </div>
  );
}