import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const protocols = ["MQTT", "HTTPS REST API", "WebSocket", "RTSP", "RTP", "ONVIF", "Modbus TCP", "Modbus RTU", "RS485", "UART", "Bluetooth BLE", "Zigbee", "LoRa", "Ethernet", "Wi-Fi"];
const authMethods = ["None", "Basic Auth", "Digest Auth", "Bearer Token", "API Key", "SSL Certificate", "OAuth2"];
const categories = [
  { value: "gateway", label: "Gateway" }, { value: "camera", label: "Camera" },
  { value: "sensor", label: "Sensor" }, { value: "deterrent", label: "Deterrent" },
  { value: "relay", label: "Relay" }, { value: "actuator", label: "Actuator" }, { value: "other", label: "Other" },
];
const deviceTypes = [
  "Raspberry Pi Gateway", "AI Camera", "CCTV Camera", "IP Camera", "PTZ Camera", "Thermal Camera",
  "Temperature Sensor", "Humidity Sensor", "Rain Sensor", "Motion Sensor", "PIR Sensor", "Ultrasonic Sensor",
  "Light Sensor", "Soil Moisture Sensor", "GPS Device", "Relay Controller", "Smart Switch",
  "Siren", "Flashing Light", "Speaker", "Mechanical Trigger", "AI Controller", "Edge Gateway", "Custom Device",
];
const powerSources = ["AC", "DC", "Solar", "Battery", "PoE", "Hybrid"];

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export default function DeviceFormModal({ open, onOpenChange, onSubmit, editing, sites, templates }) {
  const [form, setForm] = useState({});
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
    } else {
      setForm({
        name: "", device_type: "AI Camera", category: "camera", manufacturer: "", brand: "", model: "",
        serial_number: "", firmware_version: "", hardware_version: "", operating_system: "",
        mac_address: "", ip_address: "", gateway_address: "", protocol: "MQTT", auth_method: "Basic Auth",
        username: "", encrypted_password: "", api_token: "", ssl_certificate: "",
        latitude: null, longitude: null, installation_address: "", site_id: "", site_name: "",
        power_source: "AC", voltage: null, battery_level: 100, solar_status: "",
        signal_strength: 100, network_quality: "good", health_score: 100,
        ai_capability: false, ai_model_version: "", storage_capacity_gb: null, available_storage_gb: null,
        cpu_usage: 0, ram_usage: 0, temperature_c: 0, uptime_hours: 0,
        notes: "", installation_date: "", warranty_expiry: "", maintenance_schedule: "",
        status: "online", enabled: true,
      });
    }
    setActiveTab("basic");
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyTemplate = (templateName) => {
    const t = templates?.find(t => t.name === templateName);
    if (t) {
      setForm(f => ({
        ...f, device_type: t.device_type, category: t.category,
        manufacturer: t.manufacturer || f.manufacturer,
        protocol: t.default_protocol || f.protocol,
        power_source: t.default_power_source || f.power_source,
        ai_capability: t.ai_capable ?? f.ai_capability,
      }));
    }
  };

  const tabs = [
    { id: "basic", label: "Basic" },
    { id: "network", label: "Network" },
    { id: "location", label: "Location" },
    { id: "system", label: "System" },
    { id: "maintenance", label: "Maintenance" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing?.id ? "Edit Device" : "Add New Device"}</DialogTitle></DialogHeader>

        <div className="flex gap-1 border-b border-slate-100 mb-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>{t.label}</button>
          ))}
        </div>

        <div className="space-y-5">
          {activeTab === "basic" && (
            <Section title="Basic Information">
              {!editing && templates?.length > 0 && (
                <div><Label className="text-xs">Apply Template (optional)</Label>
                  <Select onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="Select a template to pre-fill" /></SelectTrigger>
                    <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Device Name *"><Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. East Field Camera" /></Field>
                <Field label="Device Type *">
                  <Select value={form.device_type} onValueChange={v => set("device_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{deviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Category">
                  <Select value={form.category} onValueChange={v => set("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Manufacturer"><Input value={form.manufacturer || ""} onChange={e => set("manufacturer", e.target.value)} placeholder="e.g. UNIARCH" /></Field>
                <Field label="Brand"><Input value={form.brand || ""} onChange={e => set("brand", e.target.value)} /></Field>
                <Field label="Model"><Input value={form.model || ""} onChange={e => set("model", e.target.value)} placeholder="e.g. P2S Dual-Lens" /></Field>
                <Field label="Serial Number"><Input value={form.serial_number || ""} onChange={e => set("serial_number", e.target.value)} /></Field>
                <Field label="Site / Project">
                  <Select value={form.site_id || ""} onValueChange={v => { const s = sites.find(s => s.id === v); set("site_id", v); set("site_name", s?.name || ""); }}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          )}

          {activeTab === "network" && (
            <Section title="Network & Communication">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Protocol">
                  <Select value={form.protocol} onValueChange={v => set("protocol", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{protocols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Auth Method">
                  <Select value={form.auth_method} onValueChange={v => set("auth_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{authMethods.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="IP Address"><Input value={form.ip_address || ""} onChange={e => set("ip_address", e.target.value)} placeholder="192.168.1.100" /></Field>
                <Field label="Gateway Address"><Input value={form.gateway_address || ""} onChange={e => set("gateway_address", e.target.value)} placeholder="192.168.1.1" /></Field>
                <Field label="MAC Address"><Input value={form.mac_address || ""} onChange={e => set("mac_address", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" /></Field>
                <Field label="Username"><Input value={form.username || ""} onChange={e => set("username", e.target.value)} /></Field>
                <Field label="Password (encrypted)"><Input type="password" value={form.encrypted_password || ""} onChange={e => set("encrypted_password", e.target.value)} /></Field>
                <Field label="API Token"><Input value={form.api_token || ""} onChange={e => set("api_token", e.target.value)} /></Field>
                <Field label="SSL Certificate" full><Input value={form.ssl_certificate || ""} onChange={e => set("ssl_certificate", e.target.value)} placeholder="Certificate fingerprint or path" /></Field>
              </div>
            </Section>
          )}

          {activeTab === "location" && (
            <Section title="Location & Power">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude"><Input type="number" value={form.latitude ?? ""} onChange={e => set("latitude", parseFloat(e.target.value) || null)} /></Field>
                <Field label="Longitude"><Input type="number" value={form.longitude ?? ""} onChange={e => set("longitude", parseFloat(e.target.value) || null)} /></Field>
                <Field label="Installation Address" full><Input value={form.installation_address || ""} onChange={e => set("installation_address", e.target.value)} /></Field>
                <Field label="Power Source">
                  <Select value={form.power_source} onValueChange={v => set("power_source", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{powerSources.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Voltage (V)"><Input type="number" value={form.voltage ?? ""} onChange={e => set("voltage", parseFloat(e.target.value) || null)} /></Field>
                <Field label="Battery Level (%)"><Input type="number" value={form.battery_level ?? 100} onChange={e => set("battery_level", parseInt(e.target.value) || 0)} /></Field>
                <Field label="Solar Status"><Input value={form.solar_status || ""} onChange={e => set("solar_status", e.target.value)} placeholder="e.g. Charging / Not connected" /></Field>
                <Field label="Signal Strength (%)"><Input type="number" value={form.signal_strength ?? 100} onChange={e => set("signal_strength", parseInt(e.target.value) || 0)} /></Field>
                <Field label="Network Quality">
                  <Select value={form.network_quality} onValueChange={v => set("network_quality", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["excellent", "good", "fair", "poor", "none"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          )}

          {activeTab === "system" && (
            <Section title="System & AI">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Firmware Version"><Input value={form.firmware_version || ""} onChange={e => set("firmware_version", e.target.value)} placeholder="1.0.0" /></Field>
                <Field label="Hardware Version"><Input value={form.hardware_version || ""} onChange={e => set("hardware_version", e.target.value)} /></Field>
                <Field label="Operating System"><Input value={form.operating_system || ""} onChange={e => set("operating_system", e.target.value)} placeholder="e.g. Raspberry Pi OS" /></Field>
                <Field label="AI Model Version"><Input value={form.ai_model_version || ""} onChange={e => set("ai_model_version", e.target.value)} placeholder="e.g. yolov8n-v1.0" /></Field>
                <Field label="Storage Capacity (GB)"><Input type="number" value={form.storage_capacity_gb ?? ""} onChange={e => set("storage_capacity_gb", parseFloat(e.target.value) || null)} /></Field>
                <Field label="Available Storage (GB)"><Input type="number" value={form.available_storage_gb ?? ""} onChange={e => set("available_storage_gb", parseFloat(e.target.value) || null)} /></Field>
                <Field label="CPU Usage (%)"><Input type="number" value={form.cpu_usage ?? 0} onChange={e => set("cpu_usage", parseInt(e.target.value) || 0)} /></Field>
                <Field label="RAM Usage (%)"><Input type="number" value={form.ram_usage ?? 0} onChange={e => set("ram_usage", parseInt(e.target.value) || 0)} /></Field>
                <Field label="Temperature (°C)"><Input type="number" value={form.temperature_c ?? 0} onChange={e => set("temperature_c", parseInt(e.target.value) || 0)} /></Field>
                <Field label="Uptime (hours)"><Input type="number" value={form.uptime_hours ?? 0} onChange={e => set("uptime_hours", parseInt(e.target.value) || 0)} /></Field>
                <div className="col-span-2 flex items-center gap-3 pt-1">
                  <Switch checked={form.ai_capability || false} onCheckedChange={v => set("ai_capability", v)} />
                  <Label className="text-sm">AI Capability Enabled</Label>
                </div>
              </div>
            </Section>
          )}

          {activeTab === "maintenance" && (
            <Section title="Maintenance & Notes">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Installation Date"><Input type="date" value={form.installation_date || ""} onChange={e => set("installation_date", e.target.value)} /></Field>
                <Field label="Warranty Expiry"><Input type="date" value={form.warranty_expiry || ""} onChange={e => set("warranty_expiry", e.target.value)} /></Field>
                <Field label="Maintenance Schedule" full><Input value={form.maintenance_schedule || ""} onChange={e => set("maintenance_schedule", e.target.value)} placeholder="e.g. Quarterly check" /></Field>
                <Field label="Health Score (0-100)"><Input type="number" value={form.health_score ?? 100} onChange={e => set("health_score", parseInt(e.target.value) || 0)} /></Field>
                <Field label="Error Status"><Input value={form.error_status || ""} onChange={e => set("error_status", e.target.value)} placeholder="e.g. None" /></Field>
                <Field label="Notes" full><Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></Field>
                <div className="col-span-2 flex items-center gap-3 pt-1">
                  <Switch checked={form.enabled ?? true} onCheckedChange={v => set("enabled", v)} />
                  <Label className="text-sm">Device Enabled</Label>
                </div>
              </div>
            </Section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} className="bg-emerald-600 hover:bg-emerald-700">{editing?.id ? "Save Changes" : "Add Device"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}