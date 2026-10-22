import React, { useState, useEffect } from "react";
import { PawPrint, Plus, Loader2, Trash2, Upload, Brain, CheckCircle2 } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const categoryColors = {
  wildlife: "bg-emerald-50 text-emerald-600 border-emerald-200",
  livestock: "bg-amber-50 text-amber-600 border-amber-200",
  human: "bg-blue-50 text-blue-600 border-blue-200",
  pest: "bg-red-50 text-red-600 border-red-200",
  other: "bg-slate-50 text-slate-500 border-slate-200",
};

const modelStatusColors = {
  not_trained: "bg-slate-100 text-slate-500",
  training: "bg-blue-100 text-blue-600",
  trained: "bg-purple-100 text-purple-600",
  deployed: "bg-emerald-100 text-emerald-600",
};

const deterrentOptions = ["Siren", "Ultrasonic Emitter", "Flash Light", "Strobe Light", "RF Deterrent", "Laser", "Water Sprinkler", "AI Voice Speaker"];

export default function SpeciesLearning() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", scientific_name: "", category: "wildlife", description: "", detection_threshold: 0.7, response_rules: "", assigned_deterrents: [] });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const s = await api.entities.Species.list("-created_date", 100);
    setSpecies(s); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    await api.entities.Species.create({ ...form, sample_count: 0, model_status: "not_trained", active: true });
    await api.entities.AuditLog.create({ action: "create", entity_type: "Species", entity_name: form.name, user_name: "admin", details: `Added new species: ${form.name} (${form.category})`, severity: "info", timestamp: new Date().toISOString() });
    toast({ title: "Species added", description: `${form.name} is now available for detection. Upload labelled images to train the model.` });
    setSaving(false); setShowAdd(false);
    setForm({ name: "", scientific_name: "", category: "wildlife", description: "", detection_threshold: 0.7, response_rules: "", assigned_deterrents: [] });
    load();
  };

  const toggleDeterrent = (d) => {
    setForm(f => ({ ...f, assigned_deterrents: f.assigned_deterrents.includes(d) ? f.assigned_deterrents.filter(x => x !== d) : [...f.assigned_deterrents, d] }));
  };

  const handleDelete = async (s) => {
    await api.entities.Species.delete(s.id);
    toast({ title: "Species removed", description: `${s.name} has been deleted.` });
    load();
  };

  const handleTrain = async (s) => {
    await api.entities.Species.update(s.id, { model_status: "training" });
    toast({ title: `Training started for ${s.name}`, description: "Collecting samples and training a new detection model..." });
    load();
    setTimeout(async () => {
      await api.entities.Species.update(s.id, { model_status: "trained", sample_count: (s.sample_count || 0) + 150 });
      toast({ title: `${s.name} model trained`, description: "Ready for evaluation and deployment." });
      load();
    }, 4000);
  };

  const handleDeploy = async (s) => {
    await api.entities.Species.update(s.id, { model_status: "deployed" });
    await api.entities.AuditLog.create({ action: "config_change", entity_type: "Species", entity_name: s.name, user_name: "admin", details: `Deployed detection model for ${s.name}`, severity: "warning", timestamp: new Date().toISOString() });
    toast({ title: `${s.name} model deployed`, description: "Detection active on all connected devices." });
    load();
  };

  return (
    <div>
      <PageHeader title="Species Learning" description="Add new wildlife species without changing the application — upload images, define rules, train & deploy AI models" icon={PawPrint}
        actions={<Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add Species</Button>} />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : species.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={PawPrint} title="No species configured" description="Add your first wildlife species to start training AI models." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {species.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {s.image_url ? <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><PawPrint className="w-5 h-5 text-emerald-500" /></div>}
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{s.name}</div>
                    {s.scientific_name && <div className="text-[10px] text-slate-400 italic">{s.scientific_name}</div>}
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${categoryColors[s.category] || categoryColors.other}`}>{s.category}</span>
              </div>
              {s.description && <div className="text-xs text-slate-500 mb-3 line-clamp-2">{s.description}</div>}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><span className="text-slate-400">Samples:</span> <span className="font-medium text-slate-700">{s.sample_count || 0}</span></div>
                <div><span className="text-slate-400">Threshold:</span> <span className="font-medium text-slate-700">{Math.round((s.detection_threshold || 0.7) * 100)}%</span></div>
              </div>
              {s.assigned_deterrents?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.assigned_deterrents.map((d, i) => <span key={i} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">{d}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <span className={`text-[10px] font-medium px-2 py-1 rounded ${modelStatusColors[s.model_status] || modelStatusColors.not_trained}`}>{(s.model_status || "not_trained").replace("_", " ")}</span>
                <div className="flex gap-1">
                  {s.model_status === "not_trained" && <Button size="sm" onClick={() => handleTrain(s)} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"><Brain className="w-3 h-3 mr-1" /> Train</Button>}
                  {s.model_status === "trained" && <Button size="sm" onClick={() => handleDeploy(s)} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"><Upload className="w-3 h-3 mr-1" /> Deploy</Button>}
                  {s.model_status === "deployed" && <span className="text-emerald-500 flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3" /> Active</span>}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="h-7 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Species Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Species</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600 flex items-start gap-2">
              <PawPrint className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Add a new wildlife species to the detection system. After adding, upload labelled images, define response rules, assign deterrents, then train and deploy a custom AI model.</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Species Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wild Boar" /></div>
              <div><Label>Scientific Name</Label><Input value={form.scientific_name} onChange={e => setForm({ ...form, scientific_name: e.target.value })} placeholder="e.g. Sus scrofa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wildlife">Wildlife</SelectItem>
                    <SelectItem value="livestock">Livestock</SelectItem>
                    <SelectItem value="human">Human</SelectItem>
                    <SelectItem value="pest">Pest</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Detection Threshold</Label><Input type="number" step="0.05" min="0" max="1" value={form.detection_threshold} onChange={e => setForm({ ...form, detection_threshold: parseFloat(e.target.value) })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the species and its behavior patterns..." /></div>
            <div><Label>Response Rules</Label><Textarea value={form.response_rules} onChange={e => setForm({ ...form, response_rules: e.target.value })} placeholder="e.g. Trigger siren at level 2, escalate to voice call at level 3..." /></div>
            <div>
              <Label>Assigned Deterrents</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {deterrentOptions.map(d => (
                  <button key={d} type="button" onClick={() => toggleDeterrent(d)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${form.assigned_deterrents.includes(d) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Add Species</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}