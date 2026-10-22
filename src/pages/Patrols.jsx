import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Footprints, Plus, Search, Loader2, MapPin, Clock, Users } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import DemoBadge from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";

export default function Patrols() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sector: "", park_id: "", objectives: "", assigned_rangers: "" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.entities.Patrol.list("-created_date", 200),
      api.entities.Site.list(),
    ]).then(([p, s]) => { setItems(p); setSites(s); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => {
    const ms = (p.name || p.sector || p.patrol_id || "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || p.status === filter;
    return ms && mf;
  });

  const handleCreate = async () => {
    if (!form.name || !form.sector) { toast({ title: "Patrol name and sector are required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const me = await api.auth.me().catch(() => null);
      const site = sites.find((s) => s.id === form.park_id);
      await api.entities.Patrol.create({
        patrol_id: "PAT-" + Date.now().toString(36).toUpperCase(),
        name: form.name,
        sector: form.sector,
        park_id: form.park_id || undefined,
        park_name: site?.name || "",
        status: "planned",
        assigned_rangers: form.assigned_rangers ? form.assigned_rangers.split(",").map((r) => r.trim()).filter(Boolean) : [],
        objectives: form.objectives,
        created_by: me?.id || "",
        is_demo: true,
      });
      toast({ title: "Patrol created", variant: "success" });
      setOpen(false);
      setForm({ name: "", sector: "", park_id: "", objectives: "", assigned_rangers: "" });
      load();
    } catch {
      toast({ title: "Failed to create patrol", variant: "destructive" });
    } finally { setCreating(false); }
  };

  const counts = {
    all: items.length,
    planned: items.filter((p) => p.status === "planned").length,
    active: items.filter((p) => p.status === "active").length,
    completed: items.filter((p) => p.status === "completed").length,
  };

  return (
    <div>
      <PageHeader
        title={t("patrols.title")}
        description={t("patrols.desc")}
        icon={Footprints}
        actions={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> {t("patrols.new")}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total", v: counts.all },
          { l: "Planned", v: counts.planned },
          { l: "Active", v: counts.active },
          { l: "Completed", v: counts.completed },
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patrols…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1 flex-wrap">
          {[{ k: "all", l: "All" }, { k: "planned", l: "Planned" }, { k: "active", l: "Active" }, { k: "completed", l: "Completed" }].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filter === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Footprints} title="No patrols found" description="Plan a patrol and assign rangers to begin field coverage tracking." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to={`/patrols/${p.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={p.status || "planned"} />
                {p.is_demo && <DemoBadge />}
              </div>
              <div className="font-semibold text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-400 font-mono mb-2">{p.patrol_id}</div>
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {p.sector} · {p.park_name || "—"}</div>
                <div className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {p.assigned_rangers?.length || 0} rangers</div>
                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {p.distance_km ? `${p.distance_km} km` : "Not started"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("patrols.new")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Patrol Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarangkot Morning Patrol" />
            </div>
            <div className="space-y-1.5">
              <Label>Sector *</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="e.g. Sector A" />
            </div>
            <div className="space-y-1.5">
              <Label>Protected Area</Label>
              <Select value={form.park_id} onValueChange={(v) => setForm({ ...form, park_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Assigned Rangers (comma separated)</Label>
              <Input value={form.assigned_rangers} onChange={(e) => setForm({ ...form, assigned_rangers: e.target.value })} placeholder="e.g. Ram Bahadur, Sita Gurung" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Objectives</Label>
              <Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={3} placeholder="e.g. Check for snares, monitor wildlife movement, verify camera traps" />
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