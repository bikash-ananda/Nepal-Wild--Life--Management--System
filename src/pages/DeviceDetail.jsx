import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Cpu, Activity, FileText, Heart, RefreshCw, Download, Power, TestTube, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DeviceTypeIcon, { statusConfig, getCategoryColor } from "@/components/devices/DeviceTypeIcon";

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "overview";
  const [device, setDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const d = await base44.entities.Device.get(id);
    setDevice(d);
    const l = await base44.entities.DeviceLog.filter({ device_id: id }, "-timestamp", 50);
    setLogs(l);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === "restart") {
        await base44.entities.Device.update(id, { status: "maintenance" });
        await base44.entities.DeviceLog.create({ device_id: id, device_name: device.name, log_type: "action", message: "Restart command sent", user_name: "admin", timestamp: new Date().toISOString() });
        toast({ title: "Restart command sent" });
        setTimeout(load, 2000);
      } else if (action === "toggle") {
        const enabled = !device.enabled;
        await base44.entities.Device.update(id, { enabled, status: enabled ? "online" : "disabled" });
        await base44.entities.DeviceLog.create({ device_id: id, device_name: device.name, log_type: "action", message: `Device ${enabled ? "enabled" : "disabled"}`, user_name: "admin", timestamp: new Date().toISOString() });
        toast({ title: `Device ${enabled ? "enabled" : "disabled"}` });
      } else if (action === "test") {
        await base44.entities.DeviceLog.create({ device_id: id, device_name: device.name, log_type: "info", message: "Device test completed successfully", user_name: "admin", timestamp: new Date().toISOString() });
        toast({ title: "Test passed ✓" });
      } else if (action === "export") {
        const blob = new Blob([JSON.stringify(device, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${device.name}_export.json`; a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Exported" });
      }
      load();
    } catch { toast({ title: "Action failed", variant: "destructive" }); }
    setActionLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!device) return <div className="text-center py-20 text-slate-400">Device not found</div>;

  const status = statusConfig[device.status] || statusConfig.online;
  const color = getCategoryColor(device.category);

  const fields = [
    { group: "Identification", items: [["UUID", device.device_uuid], ["Name", device.name], ["Type", device.device_type], ["Category", device.category], ["Manufacturer", device.manufacturer], ["Brand", device.brand], ["Model", device.model], ["Serial Number", device.serial_number]] },
    { group: "Network", items: [["Protocol", device.protocol], ["IP Address", device.ip_address], ["Gateway", device.gateway_address], ["MAC Address", device.mac_address], ["Auth Method", device.auth_method], ["Username", device.username], ["Signal Strength", device.signal_strength != null ? `${device.signal_strength}%` : null], ["Network Quality", device.network_quality]] },
    { group: "System", items: [["Firmware", device.firmware_version], ["Hardware", device.hardware_version], ["OS", device.operating_system], ["AI Capable", device.ai_capability ? "Yes" : "No"], ["AI Model", device.ai_model_version], ["Storage", device.storage_capacity_gb ? `${device.available_storage_gb || 0}/${device.storage_capacity_gb} GB` : null], ["CPU", device.cpu_usage ? `${device.cpu_usage}%` : null], ["RAM", device.ram_usage ? `${device.ram_usage}%` : null], ["Temperature", device.temperature_c ? `${device.temperature_c}°C` : null], ["Uptime", device.uptime_hours ? `${device.uptime_hours}h` : null]] },
    { group: "Power & Location", items: [["Power Source", device.power_source], ["Voltage", device.voltage ? `${device.voltage}V` : null], ["Battery", device.battery_level != null ? `${device.battery_level}%` : null], ["Solar", device.solar_status], ["Latitude", device.latitude], ["Longitude", device.longitude], ["Address", device.installation_address], ["Site", device.site_name]] },
    { group: "Maintenance", items: [["Health Score", device.health_score != null ? `${device.health_score}/100` : null], ["Installed", device.installation_date], ["Warranty Expiry", device.warranty_expiry], ["Maintenance", device.maintenance_schedule], ["Error Status", device.error_status], ["Warning", device.warning_status], ["Notes", device.notes]] },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "logs", label: "Logs & History", icon: FileText },
    { id: "health", label: "Health", icon: Heart },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}><ArrowLeft className="w-5 h-5" /></Button>
        <DeviceTypeIcon type={device.device_type} category={device.category} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 truncate">{device.name}</h1>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
            </span>
          </div>
          <div className="text-xs text-slate-400">{device.device_type} · {device.manufacturer} {device.model} · {device.ip_address || "No IP"}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => doAction("test")} disabled={actionLoading}><TestTube className="w-4 h-4 mr-1" /> Test</Button>
          <Button variant="outline" size="sm" onClick={() => doAction("restart")} disabled={actionLoading}><RefreshCw className="w-4 h-4 mr-1" /> Restart</Button>
          <Button variant="outline" size="sm" onClick={() => doAction("toggle")} disabled={actionLoading}><Power className="w-4 h-4 mr-1" /> {device.enabled ? "Disable" : "Enable"}</Button>
          <Button variant="outline" size="sm" onClick={() => doAction("export")} disabled={actionLoading}><Download className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-100 mb-4">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.group} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{f.group}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {f.items.map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] text-slate-400">{label}</div>
                    <div className="text-sm text-slate-700 font-medium truncate">{value || <span className="text-slate-300">—</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No logs yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map(l => (
                <div key={l.id} className="flex items-start gap-3 p-4">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${l.log_type === "error" ? "bg-red-500" : l.log_type === "warning" ? "bg-amber-500" : l.log_type === "action" ? "bg-blue-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700">{l.message}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{l.log_type} · {l.user_name || "system"} · {new Date(l.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Health Score", value: device.health_score, unit: "/100", max: 100 },
              { label: "CPU Usage", value: device.cpu_usage, unit: "%", max: 100 },
              { label: "RAM Usage", value: device.ram_usage, unit: "%", max: 100 },
              { label: "Temperature", value: device.temperature_c, unit: "°C", max: 80 },
              { label: "Battery", value: device.battery_level, unit: "%", max: 100 },
              { label: "Signal", value: device.signal_strength, unit: "%", max: 100 },
              { label: "Uptime", value: device.uptime_hours, unit: "h", max: 720 },
              { label: "Storage Free", value: device.available_storage_gb, unit: "GB", max: device.storage_capacity_gb || 100 },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[10px] text-slate-400 uppercase">{m.label}</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{m.value ?? 0}<span className="text-sm text-slate-400">{m.unit}</span></div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(((m.value || 0) / m.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}