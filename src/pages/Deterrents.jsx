import React, { useState, useEffect } from "react";
import { Zap, Plus, Trash2, Volume2, Radio, Lightbulb, Waves, Crosshair, Droplets, Cpu, Bot as Drone, Speaker } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const deviceTypes = [
  { value: "siren", label: "Siren", icon: Volume2, color: "text-red-500" },
  { value: "ultrasonic_emitter", label: "Ultrasonic Emitter", icon: Waves, color: "text-purple-500" },
  { value: "flash_light", label: "Flash Light", icon: Lightbulb, color: "text-amber-500" },
  { value: "strobe_light", label: "Strobe Light", icon: Lightbulb, color: "text-yellow-500" },
  { value: "rf_deterrent", label: "RF Deterrent", icon: Radio, color: "text-blue-500" },
  { value: "laser", label: "Laser", icon: Crosshair, color: "text-rose-500" },
  { value: "water_sprinkler", label: "Water Sprinkler", icon: Droplets, color: "text-cyan-500" },
  { value: "mechanical_scarecrow", label: "Mechanical Scarecrow", icon: Cpu, color: "text-slate-500" },
  { value: "relay_controller", label: "Relay Controller", icon: Cpu, color: "text-indigo-500" },
  { value: "smart_actuator", label: "Smart Actuator", icon: Cpu, color: "text-teal-500" },
  { value: "drone", label: "Drone", icon: Drone, color: "text-sky-500" },
  { value: "ai_voice_speaker", label: "AI Voice Speaker", icon: Speaker, color: "text-green-500" },
];

const statusConfig = {
  online: { label: "Online", color: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  offline: { label: "Offline", color: "bg-slate-50 text-slate-400 border-slate-200", dot: "bg-slate-300" },
  maintenance: { label: "Maintenance", color: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  triggered: { label: "Event reported", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
};

const speciesOptions = ["monkey", "wild_boar", "elephant", "leopard", "bear", "livestock", "human", "bird"];

export default function Deterrents() {
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", device_id: "", site_id: "", type: "siren", supported_species: [], active: true });

  const load = async () => {
    const [d, s] = await Promise.all([api.entities.DeterrentDevice.list(), api.entities.Site.list()]);
    setDevices(d); setSites(s); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSpecies = (sp) => {
    setForm(f => ({ ...f, supported_species: f.supported_species.includes(sp) ? f.supported_species.filter(x => x !== sp) : [...f.supported_species, sp] }));
  };

  const create = async () => {
    if (!form.name || !form.site_id) { toast({ title: "Name and site required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    const id = `DET-${Date.now().toString(36).toUpperCase()}`;
    try {
      await api.entities.DeterrentDevice.create({ ...form, name: form.name.trim(), device_id: id, site_name: site?.name });
      setShowModal(false);
      setForm({ name: "", device_id: "", site_id: "", type: "siren", supported_species: [], active: true });
      toast({ title: "Inventory record saved", description: "The device was recorded only; it was not activated." });
      load();
    } catch (error) {
      toast({ title: "Device record could not be saved", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (d) => {
    await api.entities.DeterrentDevice.update(d.id, { active: !d.active });
    load();
  };

  const remove = async (d) => {
    await api.entities.DeterrentDevice.delete(d.id);
    load();
  };

  const filtered = filterType === "all" ? devices : devices.filter(d => d.type === filterType);

  return (
    <div>
      <PageHeader title="Device Inventory" description="Record installed or proposed devices. This app does not activate or control deterrents." icon={Zap}
        actions={<Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Register Device</Button>} />

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Pilot safeguard: listed devices are inventory records only. Sirens, relays, high-voltage systems, lights, and other deterrents cannot be activated by this software.
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-6">
        <button onClick={() => setFilterType("all")} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${filterType === "all" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <Zap className="w-5 h-5 text-slate-600" />
          <span className="text-[10px] text-slate-500 font-medium">All ({devices.length})</span>
        </button>
        {deviceTypes.map(t => {
          const Icon = t.icon;
          const count = devices.filter(d => d.type === t.value).length;
          return (
            <button key={t.value} onClick={() => setFilterType(t.value)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${filterType === t.value ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <Icon className={`w-5 h-5 ${t.color}`} />
              <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{t.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Zap} title="No deterrent devices" description="Register deterrent devices to build your response library." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const typeCfg = deviceTypes.find(t => t.value === d.type) || deviceTypes[0];
            const Icon = typeCfg.icon;
            const status = statusConfig[d.status] || statusConfig.online;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><Icon className={`w-5 h-5 ${typeCfg.color}`} /></div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{d.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{d.device_id}</div>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mb-2">{typeCfg.label} · {d.site_name || "Unassigned"}</div>
                {(d.supported_species || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(d.supported_species || []).map((s, i) => <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">{s}</span>)}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2"><Switch checked={d.active} onCheckedChange={() => toggleActive(d)} /><span className="text-xs text-slate-400">{d.active ? "In inventory" : "Archived"}</span></div>
                  <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register Deterrent Device</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Device Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. East Field Siren" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Device Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{deviceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Site</Label>
                <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Supported Species</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {speciesOptions.map(sp => (
                  <button key={sp} type="button" onClick={() => toggleSpecies(sp)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${form.supported_species.includes(sp) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{sp}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
