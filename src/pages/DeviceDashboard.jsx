import React, { useState, useEffect } from "react";
import { Cpu, Wifi, WifiOff, AlertTriangle, AlertCircle, Camera, Activity, Battery, Thermometer, Signal, HardDrive, Clock, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { statusConfig, getCategoryColor } from "@/components/devices/DeviceTypeIcon";

export default function DeviceDashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { base44.entities.Device.list().then(d => { setDevices(d); setLoading(false); }); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;

  const counts = {
    total: devices.length,
    online: devices.filter(d => d.status === "online").length,
    offline: devices.filter(d => d.status === "offline").length,
    warning: devices.filter(d => d.status === "warning").length,
    fault: devices.filter(d => d.status === "fault").length,
    disabled: devices.filter(d => d.status === "disabled").length,
    aiCameras: devices.filter(d => d.ai_capability && d.category === "camera").length,
    activeSensors: devices.filter(d => d.category === "sensor" && d.status === "online").length,
  };

  const avgBattery = devices.length ? Math.round(devices.reduce((s, d) => s + (d.battery_level || 0), 0) / devices.length) : 0;
  const avgCpu = devices.length ? Math.round(devices.reduce((s, d) => s + (d.cpu_usage || 0), 0) / devices.length) : 0;
  const avgRam = devices.length ? Math.round(devices.reduce((s, d) => s + (d.ram_usage || 0), 0) / devices.length) : 0;
  const avgTemp = devices.length ? Math.round(devices.reduce((s, d) => s + (d.temperature_c || 0), 0) / devices.length) : 0;

  const categoryData = ["gateway", "camera", "sensor", "deterrent", "relay", "actuator", "other"].map(cat => ({
    name: cat, value: devices.filter(d => d.category === cat).length, color: { gateway: "#6366f1", camera: "#3b82f6", sensor: "#10b981", deterrent: "#f59e0b", relay: "#a855f7", actuator: "#14b8a6", other: "#94a3b8" }[cat],
  })).filter(d => d.value > 0);

  const protocolData = Object.entries(devices.reduce((acc, d) => { if (d.protocol) acc[d.protocol] = (acc[d.protocol] || 0) + 1; return acc; }, {}))
    .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  const recentAlerts = devices.filter(d => d.status === "fault" || d.status === "warning").slice(0, 5);

  const stats = [
    { label: "Online", value: counts.online, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Offline", value: counts.offline, icon: WifiOff, color: "text-slate-400", bg: "bg-slate-50" },
    { label: "Warning", value: counts.warning, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Fault", value: counts.fault, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "AI Cameras", value: counts.aiCameras, icon: Camera, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Sensors", value: counts.activeSensors, icon: Activity, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Avg Battery", value: `${avgBattery}%`, icon: Battery, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg CPU", value: `${avgCpu}%`, icon: Cpu, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Avg RAM", value: `${avgRam}%`, icon: HardDrive, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Avg Temp", value: `${avgTemp}°C`, icon: Thermometer, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Total Devices", value: counts.total, icon: Signal, color: "text-slate-700", bg: "bg-slate-100" },
    { label: "Disabled", value: counts.disabled, icon: WifiOff, color: "text-slate-400", bg: "bg-slate-50" },
  ];

  return (
    <div>
      <PageHeader title="Device Dashboard" description="Real-time overview of all connected IoT devices across all projects" icon={Cpu} />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
              </div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">Device Categories</div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          ) : <div className="py-12 text-center text-sm text-slate-400">No devices</div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">Protocols in Use</div>
          {protocolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={protocolData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} /><Tooltip />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="py-12 text-center text-sm text-slate-400">No data</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">Recent Alerts</div>
        {recentAlerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No active alerts — all devices healthy</div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map(d => {
              const status = statusConfig[d.status];
              return (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.device_type} · {d.site_name || "Unassigned"}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${status.color}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}