import React, { useState, useEffect } from "react";
import { Activity, Plus, Search, Battery, Signal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const sensorTypes = [
  { value: "ultrasonic", label: "Ultrasonic" },
  { value: "pir_motion", label: "PIR Motion" },
  { value: "microwave_radar", label: "Microwave Radar" },
  { value: "light", label: "Light" },
  { value: "temperature", label: "Temperature" },
  { value: "humidity", label: "Humidity" },
  { value: "rain", label: "Rain" },
  { value: "wind", label: "Wind" },
  { value: "gps", label: "GPS" },
  { value: "sound", label: "Sound" },
  { value: "rf_detector", label: "RF Detector" },
  { value: "custom", label: "Custom" },
];

const typeIcons = {
  ultrasonic: "📡", pir_motion: "👁", microwave_radar: "📻", light: "💡",
  temperature: "🌡", humidity: "💧", rain: "🌧", wind: "💨",
  gps: "🛰", sound: "🔊", rf_detector: "📶", custom: "⚙",
};

export default function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", site_id: "", sensor_type: "pir_motion", signal_strength: 100, battery_level: 100 });

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Sensor.list("-created_date", 200),
      base44.entities.Site.list()
    ]).then(([s, st]) => { setSensors(s); setSites(st); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = sensors.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.device_id?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || s.sensor_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleCreate = async () => {
    if (!form.name || !form.site_id) { toast({ title: "Name and site are required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    try {
      await base44.entities.Sensor.create({
        ...form,
        device_id: "SEN-" + Date.now().toString(36).toUpperCase(),
        site_name: site?.name || "",
        status: "online",
        signal_strength: parseFloat(form.signal_strength) || 100,
        battery_level: parseFloat(form.battery_level) || 100,
        last_reading_time: new Date().toISOString(),
      });
      toast({ title: "Sensor registered" });
      setOpen(false);
      setForm({ name: "", site_id: "", sensor_type: "pir_motion", signal_strength: 100, battery_level: 100 });
      load();
    } catch (e) {
      toast({ title: "Failed to register sensor", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Sensors"
        description="Multi-sensor network for detection confirmation and environmental monitoring"
        icon={Activity}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Sensor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Register New Sensor</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>Sensor Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kavre PIR Sensor 01" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Site *</Label>
                  <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sensor Type</Label>
                  <Select value={form.sensor_type} onValueChange={v => setForm({ ...form, sensor_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sensorTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Signal Strength (%)</Label>
                  <Input type="number" value={form.signal_strength} onChange={e => setForm({ ...form, signal_strength: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Battery Level (%)</Label>
                  <Input type="number" value={form.battery_level} onChange={e => setForm({ ...form, battery_level: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Register</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sensors..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {sensorTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Activity} title="No sensors found" description="Register sensors to enable multi-sensor fusion detection." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">
                    {typeIcons[s.sensor_type] || "⚙"}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.site_name || "Unassigned"}</div>
                  </div>
                </div>
                <StatusBadge status={s.status || "online"} />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-slate-600 capitalize">{s.sensor_type?.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Device ID</span><span className="text-slate-600 font-mono">{s.device_id?.slice(0, 14)}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Signal className="w-3 h-3" /> Signal</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.signal_strength > 60 ? "bg-emerald-500" : s.signal_strength > 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${s.signal_strength || 0}%` }} />
                    </div>
                    <span className="text-slate-600">{s.signal_strength || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.battery_level > 50 ? "bg-emerald-500" : s.battery_level > 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${s.battery_level || 0}%` }} />
                    </div>
                    <span className="text-slate-600">{s.battery_level || 0}%</span>
                  </div>
                </div>
                {s.last_reading != null && (
                  <div className="flex justify-between pt-1 border-t border-slate-50"><span className="text-slate-400">Last Reading</span><span className="text-slate-600 font-mono">{s.last_reading} {s.last_reading_unit || ""}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}