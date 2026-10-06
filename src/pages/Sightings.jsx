import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Search, Loader2, MapPin, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import PhotoUpload from "@/components/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";

const OBS_TYPES = ["individual", "group", "tracks", "footprints", "droppings", "nest", "feeding_sign", "other"];

export default function Sightings() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ species: "", count: 1, observation_type: "individual", behavior: "", latitude: "", longitude: "", location_name: "", notes: "" });
  const [photos, setPhotos] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.WildlifeObservation.list("-created_date", 200).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => (i.species || i.location_name || i.observation_id || "").toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!form.species) { toast({ title: "Species is required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.WildlifeObservation.create({
        observation_id: "OBS-" + Date.now().toString(36).toUpperCase(),
        species: form.species,
        species_name: form.species,
        count: Number(form.count) || 1,
        observation_type: form.observation_type,
        behavior: form.behavior,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        location_name: form.location_name,
        photos,
        notes: form.notes,
        observed_by: me?.id || "",
        observer_name: me?.full_name || me?.email || "Field Observer",
        verified: false,
        observed_at: new Date().toISOString(),
        is_demo: true,
      });
      toast({ title: "Sighting recorded", variant: "success" });
      setOpen(false);
      setPhotos([]);
      setForm({ species: "", count: 1, observation_type: "individual", behavior: "", latitude: "", longitude: "", location_name: "", notes: "" });
      load();
    } catch {
      toast({ title: "Failed to record sighting", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div>
      <PageHeader
        title={t("sightings.title")}
        description={t("sightings.desc")}
        icon={Eye}
        actions={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> {t("sightings.new")}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total Sightings", v: items.length },
          { l: "Verified", v: items.filter((i) => i.verified).length },
          { l: "Pending", v: items.filter((i) => !i.verified).length },
          { l: "Species Observed", v: new Set(items.map((i) => i.species).filter(Boolean)).size },
        ].map((s) => (
          <div key={s.l} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider">{s.l}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sightings…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Eye} title="No sightings recorded" description="Record a wildlife sighting from the field in under a minute." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((i) => (
            <div key={i.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-slate-100">
                {i.photos?.[0] ? (
                  <img src={i.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Eye className="w-8 h-8 text-slate-300" /></div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-800">{i.species || "Unknown"}</div>
                  {i.is_demo && <DemoBadge />}
                </div>
                <div className="text-xs text-slate-400 font-mono mb-2">{i.observation_id}</div>
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> {i.observation_type?.replace(/_/g, " ")} · {i.count} {i.count > 1 ? "animals" : "animal"}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {i.location_name || "—"}</div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(i.observed_at || i.created_date).toLocaleDateString()}</div>
                </div>
                <div className="mt-2">
                  <StatusBadge status={i.verified ? "verified" : "pending"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("sightings.new")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Species *</Label>
              <Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="e.g. Barking Deer / मुनाल" />
            </div>
            <div className="space-y-1.5">
              <Label>Number Observed</Label>
              <Input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Observation Type</Label>
              <Select value={form.observation_type} onValueChange={(v) => setForm({ ...form, observation_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBS_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Behavior</Label>
              <Input value={form.behavior} onChange={(e) => setForm({ ...form, behavior: e.target.value })} placeholder="e.g. Grazing, resting, fleeing" />
            </div>
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="28.2096" />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="83.9856" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Location / Area</Label>
              <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Sarangkot" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label className="block mb-2">Photo</Label>
              <PhotoUpload value={photos} onChange={setPhotos} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}