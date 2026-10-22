import React, { useState, useEffect } from "react";
import { Zap, Plus, Search, Trash2, Power } from "lucide-react";
import { api } from "@/api/apiClient";
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
import { toast } from "@/components/ui/use-toast";

const deterrentTypes = [
  { value: "human_review", label: "Create human-review task" },
  { value: "notification_only", label: "Dashboard notification" },
  { value: "incident_draft", label: "Prepare incident draft" },
  { value: "researcher_escalation", label: "Escalate to researcher" },
];
const safeRuleTypes = new Set(deterrentTypes.map((type) => type.value));

export default function DecisionEngine() {
  const [rules, setRules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", site_id: "", detection_type: "monkey", min_confidence: 0.6,
    require_ultrasonic: false, require_pir: false, max_distance_m: 10,
    deterrent_type: "human_review", escalation_sequence: "review -> notify assigned team", priority: 1
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.entities.DeterrentRule.list("-priority", 200),
      api.entities.Site.list()
    ]).then(([r, st]) => { setRules(r); setSites(st); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rules.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!form.name || !form.site_id) { toast({ title: "Name and site are required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    try {
      await api.entities.DeterrentRule.create({
        ...form,
        site_name: site?.name || "",
        min_confidence: parseFloat(form.min_confidence) || 0.6,
        max_distance_m: parseFloat(form.max_distance_m) || 10,
        priority: parseInt(form.priority) || 1,
        active: true,
      });
      toast({ title: "Rule created" });
      setOpen(false);
      setForm({ name: "", site_id: "", detection_type: "monkey", min_confidence: 0.6, require_ultrasonic: false, require_pir: false, max_distance_m: 10, deterrent_type: "human_review", escalation_sequence: "review -> notify assigned team", priority: 1 });
      load();
    } catch (e) {
      toast({ title: "Failed to create rule", variant: "destructive" });
    }
  };

  const toggleActive = async (rule) => {
    if (!rule.active && !safeRuleTypes.has(rule.deterrent_type)) {
      toast({ title: "Legacy physical action blocked", description: "Only review and notification actions are allowed in this pilot.", variant: "destructive" });
      return;
    }
    try {
      await api.entities.DeterrentRule.update(rule.id, { active: !rule.active });
      load();
    } catch (e) {
      toast({ title: "Failed to update rule", variant: "destructive" });
    }
  };

  const deleteRule = async (rule) => {
    try {
      await api.entities.DeterrentRule.delete(rule.id);
      toast({ title: "Rule deleted" });
      load();
    } catch (e) {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Response Rules"
        description="Configure review and notification rules; physical actions are disabled during the pilot"
        icon={Zap}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Review Rule</DialogTitle></DialogHeader>
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
                  <Label>Safe software action</Label>
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
                  <Label>Follow-up note</Label>
                  <Input value={form.escalation_sequence} onChange={e => setForm({ ...form, escalation_sequence: e.target.value })} placeholder="review -> notify assigned team" />
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

      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <span className="font-semibold">Ward 21 pilot safeguard:</span> The current app records review rules only. It does not have an automation worker and cannot activate sirens, relays, high-voltage equipment, or other deterrents.
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
          <EmptyState icon={Zap} title="No rules configured" description="Create review and dashboard-notification rules for the research team." />
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
                      {safeRuleTypes.has(rule.deterrent_type) ? (
                        <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md capitalize">→ {rule.deterrent_type?.replace(/_/g, " ")}</span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md">Legacy physical action blocked</span>
                      )}
                    </div>
                    {rule.escalation_sequence && (
                      <div className="mt-2 text-xs text-slate-500">Escalation: {rule.escalation_sequence}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)} className="h-8 px-2" aria-label={rule.active ? "Disable rule" : "Enable rule"}>
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
