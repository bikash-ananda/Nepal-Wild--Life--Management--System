import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Swords, Plus, Search, Loader2 } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import SeverityBadge from "@/components/SeverityBadge";
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

const CONFLICT_TYPES = ["crop_damage", "livestock_attack", "human_injury", "human_death", "property_damage", "wildlife_settlement", "wildlife_agriculture", "other"];

export default function Hwc() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ conflict_type: "crop_damage", species: "", description: "", latitude: "", longitude: "", location_name: "", affected_crop: "", affected_livestock: "", livestock_count: 0, estimated_damage: "", human_casualties: "", urgency: "medium", occurred_at: "" });
  const [photos, setPhotos] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.entities.HwcCase.list("-created_date", 200).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    const ms = (i.location_name || i.description || i.conflict_type || "").toLowerCase().includes(search.toLowerCase()) || (i.case_id || "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || i.urgency === filter || i.status === filter;
    return ms && mf;
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const me = await api.auth.me().catch(() => null);
      await api.entities.HwcCase.create({
        case_id: "HWC-" + Date.now().toString(36).toUpperCase(),
        conflict_type: form.conflict_type,
        species: form.species,
        description: form.description,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        location_name: form.location_name,
        photos,
        affected_crop: form.affected_crop,
        affected_livestock: form.affected_livestock,
        livestock_count: Number(form.livestock_count) || 0,
        estimated_damage: form.estimated_damage,
        human_casualties: form.human_casualties,
        urgency: form.urgency,
        status: "reported",
        reported_by: me?.id || "",
        reporter_name: me?.full_name || me?.email || "Field Report",
        reporter_role: me?.role || "",
        occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
        is_demo: true,
      });
      toast({ title: "HWC case reported", variant: "success" });
      setOpen(false);
      setPhotos([]);
      load();
    } catch {
      toast({ title: "Failed to report HWC case", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div>
      <PageHeader
        title={t("hwc.title")}
        description={t("hwc.desc")}
        icon={Swords}
        actions={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> {t("hwc.new")}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total Cases", v: items.length, c: "bg-slate-50 text-slate-600" },
          { l: "Critical", v: items.filter((i) => i.urgency === "critical").length, c: "bg-red-50 text-red-600" },
          { l: "Crop Damage", v: items.filter((i) => i.conflict_type === "crop_damage").length, c: "bg-amber-50 text-amber-600" },
          { l: "Open", v: items.filter((i) => !["resolved", "closed"].includes(i.status)).length, c: "bg-orange-50 text-orange-600" },
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search HWC cases…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1 flex-wrap">
          {[{ k: "all", l: "All" }, { k: "critical", l: "Critical" }, { k: "crop_damage", l: "Crop" }, { k: "livestock_attack", l: "Livestock" }, { k: "reported", l: "Reported" }, { k: "resolved", l: "Resolved" }].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filter === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Swords} title="No HWC cases found" description="Report a human–wildlife conflict case to track response and resolution." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Link key={i.id} to={`/hwc/${i.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={i.urgency} />
                  {i.is_demo && <DemoBadge />}
                </div>
                <StatusBadge status={i.status || "reported"} />
              </div>
              <div className="font-semibold text-slate-800 capitalize">{i.conflict_type?.replace(/_/g, " ")}</div>
              <div className="text-xs text-slate-400 font-mono mb-2">{i.case_id}</div>
              {i.species && <div className="text-sm text-slate-600 mb-1">Species: <span className="font-medium">{i.species}</span></div>}
              {i.estimated_damage && <div className="text-sm text-slate-600 mb-1">Damage: NPR {i.estimated_damage}</div>}
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{i.location_name || "—"}</span>
                <span>{new Date(i.occurred_at || i.created_date).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("hwc.new")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Conflict Type *</Label>
              <Select value={form.conflict_type} onValueChange={(v) => setForm({ ...form, conflict_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONFLICT_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Species</Label>
              <Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="e.g. Elephant" />
            </div>
            <div className="space-y-1.5">
              <Label>Urgency *</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["critical", "high", "medium", "low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
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
              <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Hemja, Kaski" />
            </div>
            <div className="space-y-1.5">
              <Label>Affected Crop</Label>
              <Input value={form.affected_crop} onChange={(e) => setForm({ ...form, affected_crop: e.target.value })} placeholder="e.g. Maize" />
            </div>
            <div className="space-y-1.5">
              <Label>Affected Livestock</Label>
              <Input value={form.affected_livestock} onChange={(e) => setForm({ ...form, affected_livestock: e.target.value })} placeholder="e.g. Goat" />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Damage (NPR)</Label>
              <Input value={form.estimated_damage} onChange={(e) => setForm({ ...form, estimated_damage: e.target.value })} placeholder="e.g. 15000" />
            </div>
            <div className="space-y-1.5">
              <Label>Human Casualties</Label>
              <Input value={form.human_casualties} onChange={(e) => setForm({ ...form, human_casualties: e.target.value })} placeholder="e.g. 1 injured" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="block mb-2">Evidence Photos</Label>
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