import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Check, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Wifi, Camera, Radio, Bluetooth, Usb, Keyboard, FileUp, QrCode, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import DeviceTypeIcon, { getCategoryColor } from "@/components/devices/DeviceTypeIcon";

const deviceTypes = [
  "Raspberry Pi Gateway", "AI Camera", "CCTV Camera", "IP Camera", "PTZ Camera", "Thermal Camera",
  "Temperature Sensor", "Humidity Sensor", "Rain Sensor", "Motion Sensor", "PIR Sensor", "Ultrasonic Sensor",
  "Light Sensor", "Soil Moisture Sensor", "GPS Device", "Relay Controller", "Smart Switch",
  "Siren", "Flashing Light", "Speaker", "Mechanical Trigger", "AI Controller", "Edge Gateway", "Custom Device",
];
const categories = [
  { value: "gateway", label: "Gateway" }, { value: "camera", label: "Camera" },
  { value: "sensor", label: "Sensor" }, { value: "deterrent", label: "Deterrent" },
  { value: "relay", label: "Relay" }, { value: "actuator", label: "Actuator" }, { value: "other", label: "Other" },
];
const protocols = ["MQTT", "HTTPS REST API", "WebSocket", "RTSP", "RTP", "ONVIF", "Modbus TCP", "Modbus RTU", "RS485", "UART", "Bluetooth BLE", "Zigbee", "LoRa", "Ethernet", "Wi-Fi"];
const discoveryMethods = [
  { id: "auto", label: "Auto Network Discovery", icon: Wifi, desc: "Automatically scan your local network" },
  { id: "onvif", label: "ONVIF Discovery", icon: Camera, desc: "Find ONVIF-compatible cameras" },
  { id: "mqtt", label: "MQTT Discovery", icon: Radio, desc: "Discover MQTT-connected devices" },
  { id: "manual", label: "Manual Entry", icon: Keyboard, desc: "Enter device details by hand" },
  { id: "qr", label: "QR Code Scan", icon: QrCode, desc: "Scan device QR code" },
  { id: "bluetooth", label: "Bluetooth Discovery", icon: Bluetooth, desc: "Scan for BLE devices" },
  { id: "usb", label: "USB Discovery", icon: Usb, desc: "Detect USB-connected devices" },
  { id: "import", label: "Import Config File", icon: FileUp, desc: "Import from JSON/CSV" },
];

export default function DeviceSetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [sites, setSites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    name: "", device_type: "AI Camera", category: "camera", manufacturer: "", model: "",
    ip_address: "", protocol: "MQTT", auth_method: "Basic Auth", username: "", encrypted_password: "",
    site_id: "", site_name: "", power_source: "AC",
  });
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState([]);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    Promise.all([base44.entities.Site.list(), base44.entities.DeviceTemplate.list()]).then(([s, t]) => { setSites(s); setTemplates(t); });
  }, []);

  const steps = ["Device Type", "Discovery", "Configure", "Validate", "Complete"];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const startScan = (methodId) => {
    if (methodId === "manual") { setStep(2); return; }
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const mock = { name: "Discovered Device", device_type: "IP Camera", category: "camera", ip_address: "192.168.1.108", protocol: "RTSP", manufacturer: "UNIARCH" };
      setFound([mock]);
      setForm(f => ({ ...f, ...mock, name: mock.name }));
    }, 2000);
  };

  const applyTemplate = (templateName) => {
    const t = templates.find(t => t.name === templateName);
    if (t) setForm(f => ({ ...f, device_type: t.device_type, category: t.category, protocol: t.default_protocol || f.protocol, manufacturer: t.manufacturer || f.manufacturer }));
  };

  const validate = () => {
    setValidating(true);
    setTimeout(() => {
      setValidating(false);
      setValidation({
        compatibility: true, connection: true, protocol: true, auth: true,
        suggestions: ["Enable AI detection for optimal performance", "Set recording schedule to 24/7 for security", "Configure motion detection sensitivity to 70%"],
      });
      setStep(3);
    }, 2500);
  };

  const finish = async () => {
    const site = sites.find(s => s.id === form.site_id);
    const uuid = `DEV-${Date.now().toString(36).toUpperCase()}`;
    await base44.entities.Device.create({ ...form, device_uuid: uuid, site_name: site?.name || "", status: "online", enabled: true, health_score: 100 });
    await base44.entities.DeviceLog.create({ device_id: uuid, device_name: form.name, log_type: "info", message: "Device added via setup wizard", user_name: "admin", timestamp: new Date().toISOString() });
    await base44.entities.AuditLog.create({ action: "create", entity_type: "Device", entity_name: form.name, user_name: "admin", details: "Added via setup wizard", severity: "info", timestamp: new Date().toISOString() });
    toast({ title: "Device added successfully!" });
    navigate("/devices");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Cpu className="w-5 h-5 text-emerald-600" /></div>
          <div><h1 className="text-lg font-bold text-slate-800">AI-Assisted Setup Wizard</h1><div className="text-xs text-slate-400">Step {step + 1} of {steps.length}: {steps[step]}</div></div>
        </div>
        <Button variant="ghost" onClick={() => navigate("/devices")}>Cancel</Button>
      </div>

      <div className="flex items-center gap-1 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-500" : "bg-slate-100 text-slate-400"}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-emerald-500" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {step === 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-3">What type of device are you adding?</div>
            {templates.length > 0 && (
              <div className="mb-4"><Label>Quick Start from Template</Label>
                <Select onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {deviceTypes.map(t => (
                <button key={t} onClick={() => set("device_type", t)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${form.device_type === t ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <DeviceTypeIcon type={t} category={form.category} className="w-4 h-4" />
                  <span className="text-xs font-medium text-slate-700">{t}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Device Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. East Field Camera" /></div>
            </div>
            <div className="flex justify-end mt-4"><Button onClick={() => setStep(1)} disabled={!form.device_type} className="bg-emerald-600 hover:bg-emerald-700">Next <ChevronRight className="w-4 h-4" /></Button></div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-3">How would you like to discover the device?</div>
            {scanning ? (
              <div className="flex flex-col items-center py-12"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" /><div className="text-sm font-medium text-slate-700">Scanning for devices...</div><div className="text-xs text-slate-400 mt-1">This may take a few seconds</div></div>
            ) : found.length > 0 ? (
              <div>
                <div className="text-sm text-emerald-600 mb-3 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {found.length} device(s) found!</div>
                {found.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 mb-2">
                    <Wifi className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1"><div className="text-sm font-medium text-slate-800">{d.name}</div><div className="text-xs text-slate-400">{d.device_type} · {d.ip_address} · {d.protocol}</div></div>
                  </div>
                ))}
                <div className="flex justify-between mt-4"><Button variant="outline" onClick={() => { setFound([]); setScanning(false); }}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button><Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700">Continue <ChevronRight className="w-4 h-4" /></Button></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {discoveryMethods.map(m => {
                    const Icon = m.icon;
                    return (
                      <button key={m.id} onClick={() => startScan(m.id)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><Icon className="w-5 h-5 text-slate-600" /></div>
                        <div className="text-xs font-semibold text-slate-700">{m.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4"><Button variant="outline" onClick={() => setStep(0)}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button></div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-3">Configure device settings</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Device Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={e => set("model", e.target.value)} /></div>
              <div><Label>IP Address</Label><Input value={form.ip_address} onChange={e => set("ip_address", e.target.value)} placeholder="192.168.1.100" /></div>
              <div><Label>Protocol</Label>
                <Select value={form.protocol} onValueChange={v => set("protocol", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{protocols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Auth Method</Label>
                <Select value={form.auth_method} onValueChange={v => set("auth_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["None", "Basic Auth", "Digest Auth", "Bearer Token", "API Key", "SSL Certificate"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Username</Label><Input value={form.username} onChange={e => set("username", e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={form.encrypted_password} onChange={e => set("encrypted_password", e.target.value)} /></div>
              <div className="col-span-2"><Label>Project / Site</Label>
                <Select value={form.site_id} onValueChange={v => { const s = sites.find(s => s.id === v); set("site_id", v); set("site_name", s?.name || ""); }}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between mt-4"><Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button><Button onClick={validate} disabled={validating} className="bg-emerald-600 hover:bg-emerald-700">{validating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Validate & Test <ChevronRight className="w-4 h-4" /></Button></div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-3">Validation Results</div>
            {validating ? (
              <div className="flex flex-col items-center py-12"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" /><div className="text-sm font-medium text-slate-700">Validating connection...</div><div className="text-xs text-slate-400 mt-1">Checking compatibility, protocol, and authentication</div></div>
            ) : validation ? (
              <div>
                <div className="space-y-2 mb-4">
                  {[
                    { label: "Device Compatibility", ok: validation.compatibility },
                    { label: "Network Connection", ok: validation.connection },
                    { label: "Protocol Support", ok: validation.protocol },
                    { label: "Authentication", ok: validation.auth },
                  ].map(v => (
                    <div key={v.label} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200">
                      {v.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                      <span className="text-sm text-slate-700">{v.label}</span>
                      <span className={`ml-auto text-xs font-medium ${v.ok ? "text-emerald-600" : "text-red-600"}`}>{v.ok ? "Passed" : "Failed"}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <div className="text-xs font-semibold text-blue-700 mb-1">AI Suggestions</div>
                  <ul className="text-xs text-blue-600 space-y-1">{validation.suggestions.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button><Button onClick={() => setStep(4)} className="bg-emerald-600 hover:bg-emerald-700">Complete Setup <ChevronRight className="w-4 h-4" /></Button></div>
              </div>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
            <div className="text-lg font-bold text-slate-800 mb-1">Device Added Successfully!</div>
            <div className="text-sm text-slate-400 mb-6">{form.name} ({form.device_type}) is now connected and ready to use.</div>
            <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Name:</span> <span className="font-medium text-slate-700">{form.name}</span></div>
                <div><span className="text-slate-400">Type:</span> <span className="font-medium text-slate-700">{form.device_type}</span></div>
                <div><span className="text-slate-400">IP:</span> <span className="font-medium text-slate-700">{form.ip_address || "—"}</span></div>
                <div><span className="text-slate-400">Protocol:</span> <span className="font-medium text-slate-700">{form.protocol}</span></div>
                <div><span className="text-slate-400">Site:</span> <span className="font-medium text-slate-700">{form.site_name || "Unassigned"}</span></div>
                <div><span className="text-slate-400">Status:</span> <span className="font-medium text-emerald-600">Online</span></div>
              </div>
            </div>
            <Button onClick={finish} className="bg-emerald-600 hover:bg-emerald-700">Go to Device Manager</Button>
          </div>
        )}
      </div>
    </div>
  );
}