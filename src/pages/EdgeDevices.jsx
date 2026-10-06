import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Thermometer, Wifi, RefreshCw, Power, Activity, Camera, Radio, Download, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function EdgeDevices() {
  const [devices, setDevices] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const [d, c, s] = await Promise.all([
      base44.entities.EdgeDevice.list(),
      base44.entities.Camera.list(),
      base44.entities.Sensor.list(),
    ]);
    setDevices(d); setCameras(c); setSensors(s); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deviceCameras = (deviceId) => cameras.filter(c => c.site_id === devices.find(d => d.device_id === deviceId)?.site_id);
  const deviceSensors = (deviceId) => sensors.filter(s => s.site_id === devices.find(d => d.device_id === deviceId)?.site_id);

  const handleAction = async (device, action) => {
    await base44.entities.AuditLog.create({
      action: "manual_override", entity_type: "EdgeDevice", entity_id: device.id, entity_name: device.name,
      user_name: "admin", details: `${action} command sent to ${device.name}`, severity: action === "restart" ? "warning" : "info",
      timestamp: new Date().toISOString(),
    });
    toast({ title: `${action} command sent`, description: `${device.name} will ${action === "restart" ? "restart" : "check for updates"}` });
  };

  const onlineCount = devices.filter(d => d.online_status === "online").length;
  const avgCpu = devices.length > 0 ? Math.round(devices.reduce((s, d) => s + (d.cpu_usage || 0), 0) / devices.length) : 0;
  const avgTemp = devices.length > 0 ? Math.round(devices.reduce((s, d) => s + (d.temperature_c || 0), 0) / devices.length) : 0;

  return (
    <div>
      <PageHeader title="Edge Devices" description="Raspberry Pi edge AI controller management and diagnostics" icon={Cpu}
        actions={<Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-slate-400" /><span className="text-[10px] uppercase text-slate-400 font-medium">Total Devices</span></div>
          <div className="text-2xl font-bold text-slate-800">{devices.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Wifi className="w-4 h-4 text-emerald-500" /><span className="text-[10px] uppercase text-slate-400 font-medium">Online</span></div>
          <div className="text-2xl font-bold text-emerald-600">{onlineCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-blue-500" /><span className="text-[10px] uppercase text-slate-400 font-medium">Avg CPU</span></div>
          <div className="text-2xl font-bold text-slate-800">{avgCpu}%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Thermometer className="w-4 h-4 text-orange-500" /><span className="text-[10px] uppercase text-slate-400 font-medium">Avg Temp</span></div>
          <div className="text-2xl font-bold text-slate-800">{avgTemp}°C</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Cpu} title="No edge devices" description="Register Raspberry Pi edge devices to manage them here." /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devices.map(d => {
            const cams = deviceCameras(d.device_id);
            const sens = deviceSensors(d.device_id);
            const isHot = (d.temperature_c || 0) >= 70;
            const isHighCpu = (d.cpu_usage || 0) >= 85;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{d.device_id || d.id}</div>
                    </div>
                  </div>
                  <StatusBadge status={d.online_status || "online"} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1"><Activity className="w-3 h-3" /> CPU</span>
                      {isHighCpu && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isHighCpu ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${d.cpu_usage || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{d.cpu_usage || 0}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1"><HardDrive className="w-3 h-3" /> RAM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${d.memory_usage || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{d.memory_usage || 0}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1"><HardDrive className="w-3 h-3" /> Storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${d.storage_usage || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{d.storage_usage || 0}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temp</span>
                      {isHot && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="text-lg font-bold text-slate-700">{d.temperature_c || 0}°C</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-500"><Camera className="w-3.5 h-3.5" /> {cams.length} cameras</div>
                  <div className="flex items-center gap-2 text-slate-500"><Radio className="w-3.5 h-3.5" /> {sens.length} sensors</div>
                  <div className="text-slate-500">HW: {d.hardware || "Raspberry Pi 4B"}</div>
                  <div className="text-slate-500">AI: {d.ai_version || "yolov8n-v1.0"}</div>
                </div>

                {d.last_communication && (
                  <div className="text-[10px] text-slate-400 mb-3">Last comm: {new Date(d.last_communication).toLocaleString()}</div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <Button variant="outline" size="sm" onClick={() => handleAction(d, "restart")}><Power className="w-3.5 h-3.5 mr-1" /> Restart</Button>
                  <Button variant="outline" size="sm" onClick={() => handleAction(d, "update")}><Download className="w-3.5 h-3.5 mr-1" /> Update</Button>
                  <Button variant="outline" size="sm" onClick={() => handleAction(d, "diagnose")}><Activity className="w-3.5 h-3.5 mr-1" /> Diagnose</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}