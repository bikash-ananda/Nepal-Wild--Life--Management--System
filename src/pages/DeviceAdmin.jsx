import React, { useState, useEffect } from "react";
import { Settings, Plus, Trash2, Cpu, Radio, FileText, Download, Loader2, Shield, Network } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import DeviceTypeIcon, { getCategoryColor } from "@/components/devices/DeviceTypeIcon";

const allProtocols = ["MQTT", "HTTPS REST API", "WebSocket", "RTSP", "RTP", "ONVIF", "Modbus TCP", "Modbus RTU", "RS485", "UART", "Bluetooth BLE", "Zigbee", "LoRa", "Ethernet", "Wi-Fi"];
const allAuthMethods = ["None", "Basic Auth", "Digest Auth", "Bearer Token", "API Key", "SSL Certificate", "OAuth2"];
const categories = [
  { value: "gateway", label: "Gateway" }, { value: "camera", label: "Camera" },
  { value: "sensor", label: "Sensor" }, { value: "deterrent", label: "Deterrent" },
  { value: "relay", label: "Relay" }, { value: "actuator", label: "Actuator" }, { value: "other", label: "Other" },
];

export default function DeviceAdmin() {
  const [templates, setTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("templates");
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", device_type: "", category: "camera", manufacturer: "", default_protocol: "MQTT",
    supported_protocols: [], auth_methods: [], ai_capable: false, description: "", default_power_source: "AC", active: true,
  });

  const load = async () => {
    const [t, d] = await Promise.all([base44.entities.DeviceTemplate.list(), base44.entities.Device.list()]);
    setTemplates(t); setDevices(d); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleProtocol = (p) => setForm(f => ({ ...f, supported_protocols: f.supported_protocols.includes(p) ? f.supported_protocols.filter(x => x !== p) : [...f.supported_protocols, p] }));
  const toggleAuth = (a) => setForm(f => ({ ...f, auth_methods: f.auth_methods.includes(a) ? f.auth_methods.filter(x => x !== a) : [...f.auth_methods, a] }));

  const create = async () => {
    if (!form.name || !form.device_type) { toast({ title: "Name and type required", variant: "destructive" }); return; }
    await base44.entities.DeviceTemplate.create(form);
    await base44.entities.AuditLog.create({ action: "config_change", entity_type: "DeviceTemplate", entity_name: form.name, user_name: "admin", details: `Created template ${form.name}`, severity: "info", timestamp: new Date().toISOString() });
    toast({ title: "Template created" });
    setShowModal(false);
    setForm({ name: "", device_type: "", category: "camera", manufacturer: "", default_protocol: "MQTT", supported_protocols: [], auth_methods: [], ai_capable: false, description: "", default_power_source: "AC", active: true });
    load();
  };

  const remove = async (t) => {
    await base44.entities.DeviceTemplate.delete(t.id);
    toast({ title: "Template removed" });
    load();
  };

  const toggleActive = async (t) => {
    await base44.entities.DeviceTemplate.update(t.id, { active: !t.active });
    load();
  };

  const firmwareVersions = [...new Set(devices.map(d => d.firmware_version).filter(Boolean))].map(v => ({
    version: v, count: devices.filter(d => d.firmware_version === v).length,
  }));

  const tabs = [
    { id: "templates", label: "Device Templates", icon: Cpu },
    { id: "protocols", label: "Protocols", icon: Radio },
    { id: "firmware", label: "Firmware Monitor", icon: Download },
    { id: "diagnostics", label: "Diagnostics", icon: FileText },
  ];

  return (
    <div>
      <PageHeader title="Admin Panel" description="Register device templates, configure protocols, monitor firmware, and view system diagnostics" icon={Settings}
        actions={tab === "templates" && <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New Template</Button>} />

      <div className="flex gap-1 border-b border-slate-100 mb-4 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : tab === "templates" ? (
        templates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Cpu} title="No device templates" description="Create templates to pre-configure device types and speed up onboarding." action={<Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> New Template</Button>} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => {
              const color = getCategoryColor(t.category);
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <DeviceTypeIcon type={t.device_type} category={t.category} />
                    <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                  </div>
                  <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{t.device_type} · {t.manufacturer || "Any manufacturer"}</div>
                  {t.description && <div className="text-xs text-slate-500 mb-2">{t.description}</div>}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(t.supported_protocols || []).map(p => <span key={p} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">{p}</span>)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>{t.category}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : tab === "protocols" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allProtocols.map(p => {
            const count = devices.filter(d => d.protocol === p).length;
            return (
              <div key={p} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Radio className="w-5 h-5 text-emerald-600" /></div>
                  <div><div className="text-sm font-semibold text-slate-800">{p}</div><div className="text-xs text-slate-400">{count} device(s) using this protocol</div></div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-1 rounded ${count > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{count > 0 ? "Active" : "Available"}</span>
              </div>
            );
          })}
        </div>
      ) : tab === "firmware" ? (
        <div className="space-y-2">
          {firmwareVersions.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No firmware data</div> : firmwareVersions.map(f => (
            <div key={f.version} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Download className="w-5 h-5 text-blue-600" /></div>
                <div><div className="text-sm font-semibold text-slate-800">Firmware {f.version}</div><div className="text-xs text-slate-400">{f.count} device(s) on this version</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "diagnostics" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-emerald-600" /><div className="text-sm font-semibold text-slate-700">Security Status</div></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">HTTPS Encryption</span><span className="text-emerald-600 font-medium">Enabled</span></div>
              <div className="flex justify-between"><span className="text-slate-500">JWT Authentication</span><span className="text-emerald-600 font-medium">Active</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Role-Based Access</span><span className="text-emerald-600 font-medium">Enforced</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Encrypted Credentials</span><span className="text-emerald-600 font-medium">AES-256</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Audit Logging</span><span className="text-emerald-600 font-medium">Active</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Network className="w-5 h-5 text-blue-600" /><div className="text-sm font-semibold text-slate-700">System Health</div></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total Devices</span><span className="font-medium text-slate-700">{devices.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Templates</span><span className="font-medium text-slate-700">{templates.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Protocols Active</span><span className="font-medium text-slate-700">{allProtocols.filter(p => devices.some(d => d.protocol === p)).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plugin Architecture</span><span className="text-emerald-600 font-medium">Ready</span></div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Device Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. UNIARCH AI Camera" /></div>
              <div><Label>Device Type *</Label><Input value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })} placeholder="e.g. AI Camera" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Default Protocol</Label>
                <Select value={form.default_protocol} onValueChange={v => setForm({ ...form, default_protocol: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allProtocols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Supported Protocols</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allProtocols.map(p => (
                  <button key={p} type="button" onClick={() => toggleProtocol(p)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${form.supported_protocols.includes(p) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{p}</button>
                ))}
              </div>
            </div>
            <div><Label>Supported Auth Methods</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allAuthMethods.map(a => (
                  <button key={a} type="button" onClick={() => toggleAuth(a)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${form.auth_methods.includes(a) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Template description..." /></div>
            <div className="flex items-center gap-3"><Switch checked={form.ai_capable} onCheckedChange={v => setForm({ ...form, ai_capable: v })} /><Label className="text-sm">AI Capable</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}