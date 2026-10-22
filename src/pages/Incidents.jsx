import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Plus, Search, Loader2 } from "lucide-react";
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

const TYPES = ["poaching", "wildlife_killing", "injured_wildlife", "dead_wildlife", "illegal_hunting", "illegal_trapping", "illegal_trade", "habitat_destruction", "forest_fire", "encroachment", "wildlife_conflict", "wildlife_rescue", "dangerous_wildlife", "ranger_emergency", "other"];

export default function Incidents() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "poaching", severity: "medium", species: "", description: "", latitude: "", longitude: "", location_name: "", occurred_at: "" });
  const [photos, setPhotos] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.entities.Incident.list("-created_date", 200).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    const ms = (i.location_name || i.description || i.type || "").toLowerCase().includes(search.toLowerCase()) || (i.incident_id || "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || i.severity === filter || i.status === filter;
    return ms && mf;
  });

  const counts = {
    all: items.length,
    critical: items.filter((i) => i.severity === "critical").length,
    high: items.filter((i) => i.severity === "high").length,
    open: items.filter((i) => !["resolved", "closed"].includes(i.status)).length,
  };

  const handleCreate = async () => {
    if (!form.type) { toast({ title: "Incident type is required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const me = await api.auth.me().catch(() => null);
      await api.entities.Incident.create({
        incident_id: "INC-" + Date.now().toString(36).toUpperCase(),
        type: form.type,
        severity: form.severity,
        species: form.species,
        description: form.description,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        location_name: form.location_name,
        photos,
        reported_by: me?.id || "",
        reporter_name: me?.full_name || me?.email || "Field Report",
        reporter_role: me?.role || "",
        status: "reported",
        occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
        is_demo: true,
      });
      toast({ title: "Incident reported", variant: "success" });
      setOpen(false);
      setForm({ type: "poaching", severity: "medium", species: "", description: "", latitude: "", longitude: "", location_name: "", occurred_at: "" });
      setPhotos([]);
      load();
    } catch {
      toast({ title: "Failed to report incident", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div>
      <PageHeader
        title={t("incidents.title")}
        description={t("incidents.desc")}
        icon={ShieldAlert}
        actions={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> {t("incidents.new")}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total", v: counts.all, c: "bg-slate-50 text-slate-600" },
          { l: "Critical", v: counts.critical, c: "bg-red-50 text-red-600" },
          { l: "High", v: counts.high, c: "bg-orange-50 text-orange-600" },
          { l: "Open", v: counts.open, c: "bg-amber-50 text-amber-600" },
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1 flex-wrap">
          {[{ k: "all", l: "All" }, { k: "critical", l: "Critical" }, { k: "high", l: "High" }, { k: "reported", l: "Reported" }, { k: "resolved", l: "Resolved" }].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filter === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={ShieldAlert} title="No incidents found" description="Report an incident to begin tracking the response lifecycle." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Link key={i.id} to={`/incidents/${i.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={i.severity} />
                  {i.is_demo && <DemoBadge />}
                </div>
                <StatusBadge status={i.status || "reported"} />
              </div>
              <div className="font-semibold text-slate-800 capitalize">{i.type?.replace(/_/g, " ")}</div>
              <div className="text-xs text-slate-400 font-mono mb-2">{i.incident_id}</div>
              {i.description && <p className="text-sm text-slate-600 line-clamp-2 mb-2">{i.description}</p>}
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
          <DialogHeader><DialogTitle>{t("incidents.new")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Incident Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["critical", "high", "medium", "low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Species (if known)</Label>
              <Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="e.g. Leopard" />
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
              <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Kaskikot, Ward 7" />
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