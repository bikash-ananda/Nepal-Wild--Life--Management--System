import React, { useState, useEffect } from "react";
import { Workflow, Plus, Trash2, ArrowRight, Bell, Shield, FileCheck2, ClipboardList, UsersRound } from "lucide-react";
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

const conditionFields = [
  { value: "detection_type", label: "Animal Type" },
  { value: "distance_m", label: "Distance (m)" },
  { value: "object_count", label: "Object Count" },
  { value: "confidence", label: "AI Confidence" },
  { value: "motion_confirmed", label: "Motion Confirmed" },
  { value: "time_of_day", label: "Time of Day" },
  { value: "weather", label: "Weather" },
  { value: "risk_score", label: "Risk Score" },
  { value: "device_health", label: "Device Health" },
];

const operators = ["==", "!=", ">", "<", ">=", "<=", "contains"];

const actionOptions = [
  { value: "Create human-review task", icon: FileCheck2 },
  { value: "Notify assigned field team", icon: UsersRound },
  { value: "Add event to site timeline", icon: ClipboardList },
  { value: "Notify duty operator", icon: Bell },
  { value: "Escalate for ranger review", icon: Shield },
];

export default function AutomationRules() {
  const [rules, setRules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", site_id: "", description: "",
    conditions: [{ field: "detection_type", operator: "==", value: "monkey" }],
    actions: [], active: true, priority: 1,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [r, s] = await Promise.all([api.entities.AutomationRule.list("-priority"), api.entities.Site.list()]);
      setRules(r); setSites(s);
    } catch (requestError) {
      setError(requestError.message || "Automation rule drafts could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addCondition = () => setForm(f => ({ ...f, conditions: [...f.conditions, { field: "detection_type", operator: "==", value: "" }] }));
  const removeCondition = (i) => setForm(f => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i, key, val) => setForm(f => ({ ...f, conditions: f.conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c) }));

  const toggleAction = (a) => setForm(f => ({ ...f, actions: f.actions.includes(a) ? f.actions.filter(x => x !== a) : [...f.actions, a] }));

  const create = async () => {
    if (!form.name.trim() || !form.site_id) { toast({ title: "Name and site required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    setSaving(true);
    try {
      await api.entities.AutomationRule.create({ ...form, name: form.name.trim(), site_name: site?.name });
      setShowModal(false);
      setForm({ name: "", site_id: "", description: "", conditions: [{ field: "detection_type", operator: "==", value: "monkey" }], actions: [], active: false, priority: 1 });
      toast({ title: "Rule draft saved", description: "No automation worker evaluates this configuration." });
      await load();
    } catch (requestError) {
      toast({ title: "Rule draft could not be saved", description: requestError.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r) => {
    setPendingId(r.id);
    try {
      await api.entities.AutomationRule.update(r.id, { active: !r.active });
      await load();
    } catch (requestError) {
      toast({ title: "Rule setting could not be updated", description: requestError.message, variant: "destructive" });
    } finally {
      setPendingId("");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Delete the rule draft “" + r.name + "”? This cannot be undone.")) return;
    setPendingId(r.id);
    try {
      await api.entities.AutomationRule.delete(r.id);
      toast({ title: "Rule draft deleted" });
      await load();
    } catch (requestError) {
      toast({ title: "Rule draft could not be deleted", description: requestError.message, variant: "destructive" });
    } finally {
      setPendingId("");
    }
  };

  return (
    <div>
      <PageHeader title="Automation Rules" description="Draft human-reviewed workflows for the Ward 21 pilot" icon={Workflow}
        actions={<Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New Rule</Button>} />

      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Workflow} title="No rule drafts yet" description="Save a review workflow proposal for later engineering and research approval." /></div>
      ) : (
        <div className="space-y-3">
          {rules.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-800">{r.name}</span>
                    <span className="text-xs text-slate-400">· {r.site_name}</span>
                    {r.priority > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">P{r.priority}</span>}
                    {r.trigger_count > 0 && <span className="text-[10px] text-slate-500 font-medium">{r.trigger_count} recorded trigger(s) · metadata</span>}
                  </div>
                  {r.description && <p className="text-sm text-slate-500 mb-3">{r.description}</p>}

                  {/* Visual rule flow */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wide">IF</span>
                    {(r.conditions || []).map((c, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="font-bold text-slate-400 uppercase tracking-wide">AND</span>}
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 font-mono">
                          {c.field} {c.operator} {c.value}
                        </span>
                      </React.Fragment>
                    ))}
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <span className="font-bold text-slate-400 uppercase tracking-wide">THEN</span>
                    {(r.actions || []).map((a, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">{a}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">{r.active ? "Enabled · config only" : "Disabled"}</span>
                  <Switch checked={r.active} disabled={pendingId === r.id} aria-label={r.active ? "Disable saved rule configuration" : "Enable saved rule configuration"} onCheckedChange={() => toggleActive(r)} />
                  <Button variant="ghost" size="icon" disabled={pendingId === r.id} aria-label="Delete rule draft" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Pilot safeguard: rules are configuration drafts; no automation or notification worker is deployed yet. Physical deterrents and electrical devices are not controlled by this system.
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Automation Rule Draft</DialogTitle></DialogHeader>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This stores a workflow proposal only. The app does not evaluate it or send alerts, messages, or device commands.</p>
          <div className="space-y-4">
            <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monkey Near East Field" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Site</Label>
                <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this rule do?" /></div>

            {/* Conditions builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Conditions (IF / AND)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {form.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-xs font-bold text-slate-400 uppercase">AND</span>}
                    <Select value={c.field} onValueChange={v => updateCondition(i, "field", v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{conditionFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={c.operator} onValueChange={v => updateCondition(i, "operator", v)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{operators.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={c.value} onChange={e => updateCondition(i, "value", e.target.value)} placeholder="value" className="flex-1" />
                    {form.conditions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(i)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <Label>Actions (THEN)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {actionOptions.map(a => (
                  <button key={a.value} type="button" onClick={() => toggleAction(a.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${form.actions.includes(a.value) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{a.value}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setShowModal(false)}>Cancel</Button><Button disabled={saving} onClick={create} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Saving…" : "Save rule draft"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
