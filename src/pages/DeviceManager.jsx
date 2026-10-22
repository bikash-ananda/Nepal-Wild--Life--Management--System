import React, { useState, useEffect } from "react";
import { Cpu, Plus, Search, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import DeviceCard from "@/components/devices/DeviceCard";
import DeviceFormModal from "@/components/devices/DeviceFormModal";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "gateway", label: "Gateways" }, { value: "camera", label: "Cameras" },
  { value: "sensor", label: "Sensors" }, { value: "deterrent", label: "Deterrents" },
  { value: "relay", label: "Relays" }, { value: "actuator", label: "Actuators" }, { value: "other", label: "Other" },
];
export default function DeviceManager() {
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showMove, setShowMove] = useState(null);
  const [moveSite, setMoveSite] = useState("");
  const [showRename, setShowRename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    const [d, s] = await Promise.all([
      api.entities.Device.list(),
      api.entities.Site.list(),
    ]);
    setDevices(d); setSites(s); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (action, device) => {
    if (action === "view") { navigate(`/devices/${device.id}`); return; }
    if (action === "logs") { navigate(`/devices/${device.id}?tab=logs`); return; }
    if (action === "edit") { setEditing(device); setShowForm(true); return; }
    if (action === "move") { setShowMove(device); setMoveSite(device.site_id || ""); return; }
    if (action === "rename") { setShowRename(device); setRenameValue(device.name); return; }

    if (["toggle", "restart", "firmware", "health", "test"].includes(action)) {
      toast({ title: "Hardware controls are not connected", description: "This pilot keeps device records in inventory-only mode.", variant: "destructive" });
      return;
    }
    try {
      if (action === "export") {
        const data = JSON.stringify(device, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${device.name.replace(/\s/g, "_")}_export.json`;
        a.click(); URL.revokeObjectURL(url);
        toast({ title: "Device info exported" });
      } else if (action === "remove") {
        await api.entities.Device.delete(device.id);
        toast({ title: "Device removed" });
      }
    } catch (e) { toast({ title: "Action failed", description: e.message, variant: "destructive" }); }
    load();
  };

  const handleCreate = async (form) => {
    if (!form.name || !form.device_type) { toast({ title: "Name and type required", variant: "destructive" }); return; }
    const uuid = `DEV-${Date.now().toString(36).toUpperCase()}`;
    const site = sites.find(s => s.id === form.site_id);
    try {
      await api.entities.Device.create({ ...form, device_uuid: uuid, site_name: site?.name || "" });
      toast({ title: "Device saved to inventory" });
      setShowForm(false); setEditing(null);
    } catch (error) { toast({ title: "Could not save device", description: error.message, variant: "destructive" }); }
    load();
  };

  const handleUpdate = async (form) => {
    const site = sites.find(s => s.id === form.site_id);
    try {
      await api.entities.Device.update(editing.id, { ...form, site_name: site?.name || "" });
      toast({ title: "Inventory updated" });
      setShowForm(false); setEditing(null);
    } catch (error) { toast({ title: "Could not update inventory", description: error.message, variant: "destructive" }); }
    load();
  };

  const confirmMove = async () => {
    const site = sites.find(s => s.id === moveSite);
    await api.entities.Device.update(showMove.id, { site_id: moveSite, site_name: site?.name || "" });
    toast({ title: `Device moved to ${site?.name || "Unassigned"}` });
    setShowMove(null); load();
  };

  const confirmRename = async () => {
    await api.entities.Device.update(showRename.id, { name: renameValue });
    toast({ title: "Device renamed" });
    setShowRename(null); load();
  };

  const filtered = devices.filter(d => {
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.device_type?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && d.category !== filterCat) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Device Inventory" description="Keep a site-scoped register of field equipment. Network discovery and hardware commands are not connected." icon={Cpu}
        actions={<Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add inventory</Button>} />

      <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><ShieldAlert className="h-4 w-4 shrink-0" /><p>Inventory-only mode: no credentials, IP configuration, voltage values, automated deterrents, or remote hardware controls are stored or sent.</p></div>

      <div className="mb-3 text-sm text-slate-500">{devices.length} inventory record(s) · connected devices: 0</div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or type..." className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Cpu} title="No devices found" description="Add an inventory record for field equipment. Network setup is deferred." action={<Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add inventory</Button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="relative">
              <DeviceCard device={d} onAction={handleAction} onEdit={(d) => { setEditing(d); setShowForm(true); }} />
            </div>
          ))}
        </div>
      )}

      <DeviceFormModal open={showForm} onOpenChange={setShowForm}
        onSubmit={editing?.id ? handleUpdate : handleCreate}
        editing={editing} sites={sites} />

      <Dialog open={!!showMove} onOpenChange={(v) => !v && setShowMove(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move Device to Project</DialogTitle></DialogHeader>
          <div><Label>Select Project / Site</Label>
            <Select value={moveSite} onValueChange={setMoveSite}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowMove(null)}>Cancel</Button><Button onClick={confirmMove} className="bg-emerald-600 hover:bg-emerald-700">Move Device</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showRename} onOpenChange={(v) => !v && setShowRename(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Device</DialogTitle></DialogHeader>
          <div><Label>New Name</Label><Input value={renameValue} onChange={e => setRenameValue(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRename(null)}>Cancel</Button><Button onClick={confirmRename} className="bg-emerald-600 hover:bg-emerald-700">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
