import React, { useState, useEffect } from "react";
import { Zap, Plus, Search, Trash2, Power } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

const deterrentTypes = [
  { value: "siren", label: "Siren" },
  { value: "ultrasonic_speaker", label: "Ultrasonic Speaker" },
  { value: "flash_light", label: "Flash Light" },
  { value: "rf_generator", label: "RF Generator" },
  { value: "laser", label: "Laser" },
  { value: "smart_relay", label: "Smart Relay" },
  { value: "custom", label: "Custom" },
];

export default function DecisionEngine() {
  const [rules, setRules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", site_id: "", detection_type: "monkey", min_confidence: 0.6,
    require_ultrasonic: true, require_pir: false, max_distance_m: 10,
    deterrent_type: "siren", escalation_sequence: "flash -> siren -> audio", priority: 1
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.DeterrentRule.list("-priority", 200),
      base44.entities.Site.list()
    ]).then(([r, st]) => { setRules(r); setSites(st); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rules.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!form.name || !form.site_id) { toast({ title: "Name and site are required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    try {
      await base44.entities.DeterrentRule.create({
        ...form,
        site_name: site?.name || "",
        min_confidence: parseFloat(form.min_confidence) || 0.6,
        max_distance_m: parseFloat(form.max_distance_m) || 10,
        priority: parseInt(form.priority) || 1,
        active: true,
      });
      toast({ title: "Rule created" });
      setOpen(false);
      setForm({ name: "", site_id: "", detection_type: "monkey", min_confidence: 0.6, require_ultrasonic: true, require_pir: false, max_distance_m: 10, deterrent_type: "siren", escalation_sequence: "flash -> siren -> audio", priority: 1 });
      load();
    } catch (e) {
      toast({ title: "Failed to create rule", variant: "destructive" });
    }
  };

  const toggleActive = async (rule) => {
    try {
      await base44.entities.DeterrentRule.update(rule.id, { active: !rule.active });
      load();
    } catch (e) {
      toast({ title: "Failed to update rule", variant: "destructive" });
    }
  };

  const deleteRule = async (rule) => {
    try {
      await base44.entities.DeterrentRule.delete(rule.id);
      toast({ title: "Rule deleted" });
      load();
    } catch (e) {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Decision Engine"
        description="Configure sensor-fusion rules that trigger deterrents on confirmed detections"
        icon={Zap}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Deterrent Rule</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>Rule Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monkey Intrusion - Kavre" />
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
                  <Label>Detection Type</Label>
                  <Select value={form.detection_type} onValueChange={v => setForm({ ...form, detection_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monkey">Monkey</SelectItem>
                      <SelectItem value="animal">Animal</SelectItem>
                      <SelectItem value="human">Human</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deterrent Type</Label>
                  <Select value={form.deterrent_type} onValueChange={v => setForm({ ...form, deterrent_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {deterrentTypes.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Min Confidence (0-1)</Label>
                  <Input type="number" step="0.1" min="0" max="1" value={form.min_confidence} onChange={e => setForm({ ...form, min_confidence: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Distance (m)</Label>
                  <Input type="number" value={form.max_distance_m} onChange={e => setForm({ ...form, max_distance_m: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Escalation Sequence</Label>
                  <Input value={form.escalation_sequence} onChange={e => setForm({ ...form, escalation_sequence: e.target.value })} placeholder="flash -> siren -> audio" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div><div className="text-sm font-medium">Require Ultrasonic</div><div className="text-xs text-slate-400">Confirm proximity via ultrasonic</div></div>
                  <Switch checked={form.require_ultrasonic} onCheckedChange={v => setForm({ ...form, require_ultrasonic: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div><div className="text-sm font-medium">Require PIR</div><div className="text-xs text-slate-400">Confirm motion via PIR sensor</div></div>
                  <Switch checked={form.require_pir} onCheckedChange={v => setForm({ ...form, require_pir: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-800">
          <span className="font-semibold">How it works:</span> When the edge AI detects a target, the Decision Engine cross-checks sensor data (ultrasonic distance, PIR motion) before triggering a deterrent. This two-factor confirmation dramatically reduces false alarms.
        </div>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Zap} title="No rules configured" description="Create deterrent rules to automate the system's response to detections." />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rule => (
            <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.active ? "bg-emerald-50" : "bg-slate-100"}`}>
                    <Zap className={`w-5 h-5 ${rule.active ? "text-emerald-600" : "text-slate-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-800 truncate">{rule.name}</div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">P{rule.priority || 1}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{rule.site_name || "All sites"} · {rule.detection_type}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">Confidence ≥ {(rule.min_confidence || 0).toFixed(1)}</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">Distance ≤ {rule.max_distance_m || 10}m</span>
                      {rule.require_ultrasonic && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md">Ultrasonic ✓</span>}
                      {rule.require_pir && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md">PIR ✓</span>}
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md capitalize">→ {rule.deterrent_type?.replace(/_/g, " ")}</span>
                    </div>
                    {rule.escalation_sequence && (
                      <div className="mt-2 text-xs text-slate-500">Escalation: {rule.escalation_sequence}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)} className="h-8 px-2">
                    <Power className={`w-4 h-4 ${rule.active ? "text-emerald-600" : "text-slate-400"}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(rule)} className="h-8 px-2 text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}