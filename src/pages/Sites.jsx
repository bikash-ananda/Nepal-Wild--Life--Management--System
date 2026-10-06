import React, { useState, useEffect } from "react";
import { MapPin, Plus, Search, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
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

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", region: "District", latitude: "", longitude: "", address: "", geofence_radius_m: 100 });

  const load = () => {
    setLoading(true);
    base44.entities.Site.list("-created_date", 200)
      .then(setSites)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = sites.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await base44.entities.Site.create({
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        geofence_radius_m: parseFloat(form.geofence_radius_m) || 100,
        status: "active",
      });
      toast({ title: "Site created" });
      setOpen(false);
      setForm({ name: "", code: "", region: "District", latitude: "", longitude: "", address: "", geofence_radius_m: 100 });
      load();
    } catch (e) {
      toast({ title: "Failed to create site", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Manage field deployment locations and geofences"
        icon={MapPin}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register New Site</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>Site Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kavre Farm Zone A" />
                </div>
                <div className="space-y-1.5">
                  <Label>Site Code</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="KVRE-01" />
                </div>
                <div className="space-y-1.5">
                  <Label>Admin Level</Label>
                  <Select value={form.region} onValueChange={v => setForm({ ...form, region: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["National", "Provincial", "District", "Municipality", "Organization"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="27.7172" />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="85.3240" />
                </div>
                <div className="space-y-1.5">
                  <Label>Geofence Radius (m)</Label>
                  <Input type="number" value={form.geofence_radius_m} onChange={e => setForm({ ...form, geofence_radius_m: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Create Site</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Building2} title="No sites found" description="Register your first field deployment site to get started." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(site => (
            <div key={site.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{site.name}</div>
                    {site.code && <div className="text-xs text-slate-400 font-mono">{site.code}</div>}
                  </div>
                </div>
                <StatusBadge status={site.status || "active"} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Level</span><span className="text-slate-600">{site.region}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Geofence</span><span className="text-slate-600">{site.geofence_radius_m || 100} m</span></div>
                {site.latitude && site.longitude && (
                  <div className="flex justify-between"><span className="text-slate-400">GPS</span><span className="text-slate-600 font-mono text-xs">{site.latitude?.toFixed(4)}, {site.longitude?.toFixed(4)}</span></div>
                )}
                {site.address && <div className="text-slate-500 text-xs pt-1 border-t border-slate-50">{site.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}