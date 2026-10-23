import React, { useState, useEffect } from "react";
import { PawPrint, Plus, Loader2, Trash2 } from "lucide-react";
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

const deterrentOptions = ["Siren", "Ultrasonic Emitter", "Flash Light", "Strobe Light", "RF Deterrent", "Laser", "Water Sprinkler", "AI Voice Speaker"];

export default function SpeciesLearning() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", scientific_name: "", category: "wildlife", description: "", detection_threshold: 0.7, response_rules: "", assigned_deterrents: [] });
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.entities.Species.list("-created_date", 100);
      setSpecies(result);
    } catch (requestError) {
      setError(requestError.message || "Species profiles could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await api.entities.Species.create({ ...form, name: form.name.trim(), sample_count: 0, model_status: "not_trained", active: false });
      toast({ title: "Species profile saved", description: "This is reference metadata; no detector was trained or changed." });
      setShowAdd(false);
      setForm({ name: "", scientific_name: "", category: "wildlife", description: "", detection_threshold: 0.7, response_rules: "", assigned_deterrents: [] });
      await load();
    } catch (requestError) {
      toast({ title: "Species profile could not be saved", description: requestError.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleDeterrent = (d) => {
    setForm(f => ({ ...f, assigned_deterrents: f.assigned_deterrents.includes(d) ? f.assigned_deterrents.filter(x => x !== d) : [...f.assigned_deterrents, d] }));
  };

  const handleDelete = async (s) => {
    if (!window.confirm("Delete the species profile for “" + s.name + "”? This cannot be undone.")) return;
    setPendingId(s.id);
    try {
      await api.entities.Species.delete(s.id);
      toast({ title: "Species profile deleted" });
      await load();
    } catch (requestError) {
      toast({ title: "Species profile could not be deleted", description: requestError.message, variant: "destructive" });
    } finally {
      setPendingId("");
    }
  };

  return (
    <div>
      <PageHeader title="Species Reference Profiles" description="Maintain species notes for research. This page does not train, change, or deploy an AI model." icon={PawPrint}
        actions={<Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add Species</Button>} />

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Model training and deployment are not connected. Response rules and deterrent selections are saved as notes only; they do not control cameras or field equipment.</div>
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : species.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={PawPrint} title="No species profiles yet" description="Add a reference profile to document species considered in the research." /></div>
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
                <div><span className="text-slate-400">Recorded samples:</span> <span className="font-medium text-slate-700">{s.sample_count || 0}</span></div>
                <div><span className="text-slate-400">Proposed threshold:</span> <span className="font-medium text-slate-700">{Math.round((s.detection_threshold ?? 0.7) * 100)}%</span></div>
              </div>
              {s.assigned_deterrents?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.assigned_deterrents.map((d, i) => <span key={i} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">{d}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
                <span className="text-[10px] text-slate-500">Saved status: {(s.model_status || "not_trained").replaceAll("_", " ")} · metadata only</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={pendingId === s.id} aria-label={"Delete " + s.name + " profile"} onClick={() => handleDelete(s)} className="h-7 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
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
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
              <PawPrint className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Add a reference profile for research. These fields document plans only and do not affect detection or activate deterrents.</div>
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
              <div><Label>Proposed score threshold (metadata)</Label><Input type="number" step="0.05" min="0" max="1" value={form.detection_threshold} onChange={e => setForm({ ...form, detection_threshold: Number(e.target.value) || 0 })} /><p className="mt-1 text-[10px] text-slate-500">Does not change the running detector.</p></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the species and its behavior patterns..." /></div>
            <div><Label>Research response notes</Label><Textarea value={form.response_rules} onChange={e => setForm({ ...form, response_rules: e.target.value })} placeholder="Document a response idea for later review; no action will be triggered." /></div>
            <div>
              <Label>Possible responses (notes only)</Label>
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
            <Button onClick={handleAdd} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
