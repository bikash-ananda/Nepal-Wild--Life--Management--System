import React, { useState, useEffect } from "react";
import { Shield, Activity, AlertTriangle, Zap, Bell, Plus, Trash2, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ResponseLevelBadge, { levelConfig } from "@/components/ResponseLevelBadge";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const levelActions = {
  0: ["Device health monitoring", "AI standby", "Environmental monitoring"],
  1: ["Push notification", "Dashboard alert", "Camera auto-tracking", "Begin event recording", "Show predicted route", "Calculate risk score"],
  2: ["AI voice announcement", "Low-volume siren", "Flashing lights", "Ultrasonic deterrent", "Camera follows target", "Live operator notification"],
  3: ["High-power siren", "High-intensity flashing lights", "Ultrasonic activation", "RF deterrent", "Water sprinkler", "Mechanical deterrent", "Relay control", "Phone notification", "AI voice call", "SMS", "Email", "Event recording"],
  4: ["Notify multiple stakeholders", "Municipality control room", "Forest authority", "Live video streaming", "Continuous recording", "GPS tracking", "Incident report generation"],
};

const notificationChannels = ["Push", "Dashboard", "SMS", "Email", "Phone Call", "AI Voice", "Control Room"];

export default function AIResponseEngine() {
  const [protocols, setProtocols] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState("all");
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", level: 1, level_name: "Early Warning", site_id: "", detection_type: "monkey",
    trigger_conditions: "", actions: [], notification_channels: [], auto_escalate_after_seconds: 0, active: true,
  });

  const load = async () => {
    const [p, s] = await Promise.all([
      base44.entities.ResponseProtocol.list("-level"),
      base44.entities.Site.list(),
    ]);
    setProtocols(p); setSites(s); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAction = (a) => {
    setForm(f => ({
      ...f,
      actions: f.actions.includes(a) ? f.actions.filter(x => x !== a) : [...f.actions, a],
    }));
  };

  const toggleChannel = (c) => {
    setForm(f => ({
      ...f,
      notification_channels: f.notification_channels.includes(c) ? f.notification_channels.filter(x => x !== c) : [...f.notification_channels, c],
    }));
  };

  const handleLevelChange = (lvl) => {
    const num = parseInt(lvl);
    setForm(f => ({ ...f, level: num, level_name: levelConfig[num].name, actions: levelActions[num] || [] }));
  };

  const create = async () => {
    if (!form.name || !form.site_id) { toast({ title: "Name and site required", variant: "destructive" }); return; }
    const site = sites.find(s => s.id === form.site_id);
    await base44.entities.ResponseProtocol.create({ ...form, site_name: site?.name });
    await base44.entities.AuditLog.create({ action: "create", entity_type: "ResponseProtocol", entity_name: form.name, user_name: "admin", details: `Created L${form.level} protocol`, severity: "info", timestamp: new Date().toISOString() });
    setShowModal(false);
    setForm({ name: "", level: 1, level_name: "Early Warning", site_id: "", detection_type: "monkey", trigger_conditions: "", actions: [], notification_channels: [], auto_escalate_after_seconds: 0, active: true });
    toast({ title: "Protocol created" });
    load();
  };

  const toggleActive = async (p) => {
    await base44.entities.ResponseProtocol.update(p.id, { active: !p.active });
    load();
  };

  const remove = async (p) => {
    await base44.entities.ResponseProtocol.delete(p.id);
    await base44.entities.AuditLog.create({ action: "delete", entity_type: "ResponseProtocol", entity_name: p.name, user_name: "admin", details: `Deleted ${p.name}`, severity: "warning", timestamp: new Date().toISOString() });
    load();
  };

  const filtered = filterLevel === "all" ? protocols : protocols.filter(p => p.level === parseInt(filterLevel));
  const levelCounts = [0, 1, 2, 3, 4].map(l => ({ level: l, count: protocols.filter(p => p.level === l).length }));

  return (
    <div>
      <PageHeader title="AI Response Engine" description="Five-level intelligent response system with automated escalation" icon={Shield}
        actions={<Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New Protocol</Button>} />

      {/* Level overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {levelCounts.map(({ level, count }) => (
          <div key={level} className="bg-white rounded-xl border border-slate-200 p-3">
            <ResponseLevelBadge level={level} />
            <div className="text-2xl font-bold text-slate-800 mt-2">{count}</div>
            <div className="text-[10px] text-slate-400 uppercase">protocols</div>
          </div>
        ))}
      </div>

      {/* Level flow visualization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {[0, 1, 2, 3, 4].map(l => (
            <React.Fragment key={l}>
              <div className="flex flex-col items-center text-center min-w-[140px]">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${levelConfig[l].dot}`}>{l}</div>
                <div className="text-xs font-semibold text-slate-700 mt-2">{levelConfig[l].name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{levelConfig[l].desc}</div>
              </div>
              {l < 4 && <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">Filter:</span>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {[0, 1, 2, 3, 4].map(l => <SelectItem key={l} value={String(l)}>L{l} · {levelConfig[l].name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Shield} title="No protocols" description="Create response protocols for each threat level." /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <ResponseLevelBadge level={p.level} />
                    <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                    {p.site_name && <span className="text-xs text-slate-400">· {p.site_name}</span>}
                  </div>
                  {p.trigger_conditions && <p className="text-sm text-slate-500 mb-2">{p.trigger_conditions}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(p.actions || []).map((a, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100">{a}</span>
                    ))}
                  </div>
                  {(p.notification_channels || []).length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Bell className="w-3 h-3 text-slate-400" />
                      {p.notification_channels.map((c, i) => <span key={i} className="text-[10px] text-emerald-600 font-medium">{c}</span>)}
                      {p.auto_escalate_after_seconds > 0 && <span className="text-[10px] text-orange-500 font-medium">· auto-escalate {p.auto_escalate_after_seconds}s</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Response Protocol</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Protocol Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monkey Eastern Field L2" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Response Level</Label>
                <Select value={String(form.level)} onValueChange={handleLevelChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3,4].map(l => <SelectItem key={l} value={String(l)}>L{l} · {levelConfig[l].name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Site</Label>
                <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Detection Type</Label>
                <Select value={form.detection_type} onValueChange={v => setForm({ ...form, detection_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["monkey","animal","human","vehicle","wild_boar","elephant","leopard","bear","livestock"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Auto-Escalate After (s)</Label><Input type="number" value={form.auto_escalate_after_seconds} onChange={e => setForm({ ...form, auto_escalate_after_seconds: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Trigger Conditions</Label><Input value={form.trigger_conditions} onChange={e => setForm({ ...form, trigger_conditions: e.target.value })} placeholder="e.g. Monkey detected within 100m, motion confirmed" /></div>
            <div>
              <Label>Response Actions</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(levelActions[form.level] || []).map(a => (
                  <button key={a} type="button" onClick={() => toggleAction(a)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${form.actions.includes(a) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Notification Channels</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {notificationChannels.map(c => (
                  <button key={c} type="button" onClick={() => toggleChannel(c)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${form.notification_channels.includes(c) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Protocol</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}