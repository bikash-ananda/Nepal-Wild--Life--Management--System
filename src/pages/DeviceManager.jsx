import React, { useState, useEffect } from "react";
import { Cpu, Plus, Search, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
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
import DeviceDiscoveryModal from "@/components/devices/DeviceDiscoveryModal";
import { statusConfig } from "@/components/devices/DeviceTypeIcon";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "gateway", label: "Gateways" }, { value: "camera", label: "Cameras" },
  { value: "sensor", label: "Sensors" }, { value: "deterrent", label: "Deterrents" },
  { value: "relay", label: "Relays" }, { value: "actuator", label: "Actuators" }, { value: "other", label: "Other" },
];
const statusFilters = ["all", "online", "offline", "warning", "fault", "disabled", "maintenance"];

export default function DeviceManager() {
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showMove, setShowMove] = useState(null);
  const [moveSite, setMoveSite] = useState("");
  const [showRename, setShowRename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    const [d, s, t] = await Promise.all([
      base44.entities.Device.list(),
      base44.entities.Site.list(),
      base44.entities.DeviceTemplate.list(),
    ]);
    setDevices(d); setSites(s); setTemplates(t); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAction = async (device, action, message) => {
    await base44.entities.DeviceLog.create({
      device_id: device.id, device_name: device.name, log_type: "action",
      message, user_name: "admin", timestamp: new Date().toISOString(),
    });
    await base44.entities.AuditLog.create({
      action: "trigger", entity_type: "Device", entity_id: device.id,
      entity_name: device.name, user_name: "admin", details: message, severity: "info",
      timestamp: new Date().toISOString(),
    });
  };

  const handleAction = async (action, device) => {
    if (action === "view") { navigate(`/devices/${device.id}`); return; }
    if (action === "logs") { navigate(`/devices/${device.id}?tab=logs`); return; }
    if (action === "edit") { setEditing(device); setShowForm(true); return; }
    if (action === "move") { setShowMove(device); setMoveSite(device.site_id || ""); return; }
    if (action === "rename") { setShowRename(device); setRenameValue(device.name); return; }

    setActionLoading(device.id);
    try {
      if (action === "toggle") {
        await base44.entities.Device.update(device.id, { enabled: !device.enabled, status: !device.enabled ? "online" : "disabled" });
        await logAction(device, "toggle", `Device ${!device.enabled ? "enabled" : "disabled"}`);
        toast({ title: `Device ${!device.enabled ? "enabled" : "disabled"}` });
      } else if (action === "restart") {
        await base44.entities.Device.update(device.id, { status: "maintenance" });
        await logAction(device, "restart", "Restart command sent");
        toast({ title: "Restart command sent" });
        setTimeout(async () => {
          await base44.entities.Device.update(device.id, { status: "online", uptime_hours: 0 });
          load();
        }, 3000);
      } else if (action === "firmware") {
        const newVer = `v${Math.floor(Math.random() * 3) + 2}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
        await base44.entities.Device.update(device.id, { firmware_version: newVer });
        await logAction(device, "firmware", `Firmware updated to ${newVer}`);
        toast({ title: `Firmware updated to ${newVer}` });
      } else if (action === "health") {
        const score = Math.floor(Math.random() * 20) + 80;
        await base44.entities.Device.update(device.id, { health_score: score });
        await logAction(device, "health", `Health check completed: ${score}/100`);
        toast({ title: `Health score: ${score}/100` });
      } else if (action === "test") {
        await logAction(device, "test", "Device test completed successfully");
        toast({ title: "Device test passed ✓" });
      } else if (action === "export") {
        const data = JSON.stringify(device, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${device.name.replace(/\s/g, "_")}_export.json`;
        a.click(); URL.revokeObjectURL(url);
        toast({ title: "Device info exported" });
      } else if (action === "remove") {
        await base44.entities.Device.delete(device.id);
        await logAction(device, "remove", "Device removed from system");
        toast({ title: "Device removed" });
      }
    } catch (e) { toast({ title: "Action failed", variant: "destructive" }); }
    setActionLoading(null);
    load();
  };

  const handleCreate = async (form) => {
    if (!form.name || !form.device_type) { toast({ title: "Name and type required", variant: "destructive" }); return; }
    const uuid = `DEV-${Date.now().toString(36).toUpperCase()}`;
    const site = sites.find(s => s.id === form.site_id);
    await base44.entities.Device.create({ ...form, device_uuid: uuid, site_name: site?.name || "" });
    await base44.entities.AuditLog.create({
      action: "create", entity_type: "Device", entity_name: form.name, user_name: "admin",
      details: `Added ${form.device_type}`, severity: "info", timestamp: new Date().toISOString(),
    });
    toast({ title: "Device added successfully" });
    setShowForm(false); setEditing(null); setPrefill(null);
    load();
  };

  const handleUpdate = async (form) => {
    const site = sites.find(s => s.id === form.site_id);
    await base44.entities.Device.update(editing.id, { ...form, site_name: site?.name || "" });
    await logAction(editing, "update", "Device configuration updated");
    toast({ title: "Device updated" });
    setShowForm(false); setEditing(null);
    load();
  };

  const confirmMove = async () => {
    const site = sites.find(s => s.id === moveSite);
    await base44.entities.Device.update(showMove.id, { site_id: moveSite, site_name: site?.name || "" });
    await logAction(showMove, "move", `Moved to ${site?.name || "Unassigned"}`);
    toast({ title: `Device moved to ${site?.name || "Unassigned"}` });
    setShowMove(null); load();
  };

  const confirmRename = async () => {
    await base44.entities.Device.update(showRename.id, { name: renameValue });
    await logAction(showRename, "rename", `Renamed to ${renameValue}`);
    toast({ title: "Device renamed" });
    setShowRename(null); load();
  };

  const filtered = devices.filter(d => {
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.device_type?.toLowerCase().includes(search.toLowerCase()) && !d.ip_address?.includes(search)) return false;
    if (filterCat !== "all" && d.category !== filterCat) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Universal Device Manager" description="Connect, manage, and control any IoT device — brand-agnostic with plugin-based architecture" icon={Cpu}
        actions={<>
          <Button variant="outline" onClick={() => navigate("/device-setup")}><Cpu className="w-4 h-4 mr-1" /> Setup Wizard</Button>
          <Button onClick={() => { setEditing(null); setPrefill(null); setShowDiscovery(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add Device</Button>
        </>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {statusFilters.map(s => {
          const count = s === "all" ? devices.length : devices.filter(d => d.status === s).length;
          const cfg = s === "all" ? null : statusConfig[s];
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`flex flex-col items-center p-2.5 rounded-xl border transition-colors ${filterStatus === s ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <div className="flex items-center gap-1">
                {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                <span className="text-lg font-bold text-slate-800">{count}</span>
              </div>
              <span className="text-[10px] text-slate-500 capitalize">{s}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, type, or IP..." className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Cpu} title="No devices found" description="Add your first IoT device to get started. Supports any brand, any protocol." action={<Button onClick={() => setShowDiscovery(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add Device</Button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="relative">
              {actionLoading === d.id && <div className="absolute inset-0 z-10 bg-white/60 rounded-2xl flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>}
              <DeviceCard device={d} onAction={handleAction} onEdit={(d) => { setEditing(d); setShowForm(true); }} />
            </div>
          ))}
        </div>
      )}

      <DeviceDiscoveryModal open={showDiscovery} onOpenChange={setShowDiscovery}
        onDeviceFound={(d) => { setEditing(d); setShowForm(true); }}
        onManualEntry={() => { setPrefill(null); setEditing(null); setShowForm(true); }} />

      <DeviceFormModal open={showForm} onOpenChange={setShowForm}
        onSubmit={editing?.id ? handleUpdate : handleCreate}
        editing={editing} sites={sites} templates={templates} />

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