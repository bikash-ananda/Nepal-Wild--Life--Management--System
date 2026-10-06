import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Check,
  Camera as CameraIcon, Wifi, ShieldCheck, Video, Move, MapPin, Save,
  AlertTriangle, Cloud, Router, Globe
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STEPS = [
  { key: "info", label: "Camera Information", icon: CameraIcon },
  { key: "network", label: "Network", icon: Wifi },
  { key: "connection", label: "Connection Test", icon: ShieldCheck },
  { key: "video", label: "Video Test", icon: Video },
  { key: "ptz", label: "PTZ Test", icon: Move },
  { key: "location", label: "Location", icon: MapPin },
  { key: "save", label: "Save", icon: Save },
];

const MODELS = ["Dahua Hero H3A", "Dahua Hero H31", "Other IP Camera"];

const emptyForm = {
  name: "", camera_id: "", location_name: "", farm_name: "",
  province: "Gandaki", district: "Kaski", municipality: "Pokhara", ward: "",
  latitude: "28.2096", longitude: "83.9856", installation_description: "",
  model: "Dahua Hero H3A", custom_model: "", serial_number: "",
  ip_address: "", camera_port: 80, rtsp_port: 554, http_port: 80, https_port: 443,
  username: "admin", password: "", router_name: "", router_ip: "",
  connection_type: "wifi",
  rtsp_url: "", main_stream_url: "", sub_stream_url: "",
  access_method: "ddns", external_host: "", external_rtsp_port: 8554,
  external_http_port: 80, ddns_hostname: "",
  ptz_support: false, night_vision: true, audio_enabled: false,
  recording_enabled: false, ai_detection: true, resolution: "1920x1080", fps: 20,
  is_demo: true,
};

function LocationPicker({ lat, lng, onChange }) {
  const position = lat && lng ? [Number(lat), Number(lng)] : [28.2096, 83.9856];
  function ClickHandler() {
    useMapEvents({
      click(e) { onChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6)); },
    });
    return null;
  }
  return (
    <MapContainer center={position} zoom={13} style={{ height: 260, width: "100%", borderRadius: 12 }} scrollWheelZoom>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler />
      {lat && lng && <Marker position={[Number(lat), Number(lng)]} />}
    </MapContainer>
  );
}

function StatusDot({ state, label }) {
  const map = {
    ok: { c: "bg-emerald-500", t: "text-emerald-600", icon: CheckCircle2 },
    warn: { c: "bg-amber-500", t: "text-amber-600", icon: AlertTriangle },
    fail: { c: "bg-red-500", t: "text-red-600", icon: XCircle },
    pending: { c: "bg-slate-300", t: "text-slate-400", icon: null },
  };
  const s = map[state] || map.pending;
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", s.c)}>
        {Icon && <Icon className="w-3 h-3" />}
      </span>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
}

export default function CameraSetupWizard({ open, onOpenChange, sites, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ptzConfirmed, setPtzConfirmed] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const resolvedModel = form.model === "Other IP Camera" ? form.custom_model : form.model;

  const runTest = async () => {
    if (!form.rtsp_url && !form.ip_address) {
      toast({ title: "Enter the camera IP / RTSP URL first", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Build an RTSP URL from IP + ports if only IP was provided
      let rtsp = form.rtsp_url;
      if (!rtsp && form.ip_address) {
        rtsp = `rtsp://${form.username ? form.username + ":" + (form.password ? form.password : "") + "@" : ""}${form.ip_address}:${form.rtsp_port}/cam/realmonitor?channel=1&subtype=0`;
      }
      const res = await base44.functions.invoke("cameraGateway", {
        action: "testConnection",
        rtsp_url: rtsp,
        main_stream_url: form.main_stream_url || rtsp,
        sub_stream_url: form.sub_stream_url,
        ip_address: form.ip_address,
        username: form.username,
        password: form.password,
      });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ success: false, message: e.message || "Request failed", steps: [] });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Camera name is required", variant: "destructive" }); return; }
    if (!form.site_id && !form.farm_name) {
      toast({ title: "Select a farm/site or enter a farm name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const camId = form.camera_id || ("DH-" + Date.now().toString(36).toUpperCase().slice(-6));
      let site = sites.find((s) => s.id === form.site_id);
      // If a new farm name was typed without selecting a site, create the site first
      if (!site && form.farm_name) {
        site = await base44.entities.Site.create({ name: form.farm_name, region: "District", status: "active" });
      }
      let rtsp = form.rtsp_url;
      if (!rtsp && form.ip_address) {
        rtsp = `rtsp://${form.ip_address}:${form.rtsp_port}/cam/realmonitor?channel=1&subtype=0`;
      }
      await base44.entities.Camera.create({
        name: form.name,
        camera_id: camId,
        site_id: site?.id,
        site_name: site?.name || form.farm_name || "",
        brand: "Dahua",
        model: resolvedModel,
        serial_number: form.serial_number,
        ip_address: form.ip_address,
        camera_port: Number(form.camera_port),
        rtsp_port: Number(form.rtsp_port),
        http_port: Number(form.http_port),
        https_port: Number(form.https_port),
        username: form.username,
        encrypted_password: form.password ? `enc:${btoa(form.password)}` : "",
        last_credential_update: form.password ? new Date().toISOString() : undefined,
        rtsp_url: rtsp,
        main_stream_url: form.main_stream_url || rtsp,
        sub_stream_url: form.sub_stream_url || (form.ip_address ? `rtsp://${form.ip_address}:${form.rtsp_port}/cam/realmonitor?channel=1&subtype=1` : ""),
        location_name: form.location_name,
        farm_name: form.farm_name || site?.name,
        province: form.province,
        district: form.district,
        municipality: form.municipality,
        ward: form.ward,
        settlement: form.installation_description,
        installation_description: form.installation_description,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        router_name: form.router_name,
        router_ip: form.router_ip,
        connection_type: form.connection_type,
        access_method: form.access_method,
        external_host: form.external_host,
        external_rtsp_port: Number(form.external_rtsp_port) || undefined,
        external_http_port: Number(form.external_http_port) || undefined,
        ddns_hostname: form.ddns_hostname || form.external_host,
        ptz_support: form.ptz_support,
        night_vision: form.night_vision,
        audio_enabled: form.audio_enabled,
        recording_enabled: form.recording_enabled,
        ai_detection: form.ai_detection,
        resolution: form.resolution,
        fps: Number(form.fps),
        online_status: "online",
        health_status: "healthy",
        stream_status: testResult?.success ? "online" : "offline",
        ai_status: form.ai_detection ? "idle" : "disabled",
        installation_date: new Date().toISOString().slice(0, 10),
        last_heartbeat: new Date().toISOString(),
        last_successful_connection: testResult?.success ? new Date().toISOString() : undefined,
        is_demo: form.is_demo,
      });
      toast({ title: "Camera added successfully", variant: "success" });
      reset();
      onCreated && onCreated();
    } catch (e) {
      toast({ title: "Failed to save camera", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(0);
    setForm(emptyForm);
    setTestResult(null);
    setPtzConfirmed(null);
    onOpenChange(false);
  };

  const canNext = () => {
    if (step === 0) return form.name && form.model && (form.site_id || form.farm_name);
    if (step === 2) return testResult?.success;
    if (step === 4) return !form.ptz_support || ptzConfirmed !== null;
    return true;
  };

  const connectionChecks = testResult
    ? [
        { label: "Network reachable", state: testResult.success || ["network", "rtsp", "auth", "stream"].includes(testResult.step) ? "ok" : "fail" },
        { label: "Authentication successful", state: testResult.step === "auth" ? "fail" : testResult.success ? "ok" : "pending" },
        { label: "RTSP available", state: testResult.step === "rtsp" || testResult.step === "stream" ? (testResult.success ? "ok" : "fail") : testResult.success ? "ok" : "pending" },
        { label: "Video stream available", state: testResult.success ? "ok" : testResult.step === "stream" ? "fail" : "pending" },
        { label: "Snapshot available", state: testResult.success ? "ok" : "pending" },
        { label: "Latency", value: testResult.latency_ms ? `${testResult.latency_ms} ms` : "—" },
        { label: "Connection quality", value: testResult.quality || (testResult.success ? "Good" : "—") },
      ]
    : [];

  const friendlyError = (r) => {
    if (!r) return null;
    if (r.success) return null;
    const m = r.message || "";
    if (r.step === "gateway") return "The streaming gateway is not configured yet. Your camera details are still saved — live streaming will start once the gateway is set up by an administrator.";
    if (r.step === "network") return "Camera is not reachable. Check that the camera is powered on and connected to its local router.";
    if (r.step === "auth") return "Camera login failed. Please check the camera username and password.";
    if (r.step === "stream") return "Camera responded, but the video stream could not be opened. Verify the RTSP port and stream path.";
    return m || "Could not connect to the camera.";
  };

  const input = "h-9";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0">
        {/* Step sidebar + content */}
        <div className="flex flex-col md:flex-row max-h-[92vh]">
          {/* Sidebar */}
          <div className="md:w-56 md:border-r border-b md:border-b-0 border-slate-100 bg-slate-50/60 p-4 md:p-5 flex-shrink-0">
            <h2 className="font-semibold text-slate-800 mb-4 text-sm">Add Camera</h2>
            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li key={s.key}>
                    <div className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                      active ? "bg-emerald-50 text-emerald-700 font-medium" : done ? "text-slate-500" : "text-slate-400"
                    )}>
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                        active ? "bg-emerald-600 text-white" : done ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                      )}>
                        {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <span className="hidden md:inline">{s.label}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="hidden md:block mt-6 p-3 rounded-lg bg-white border border-slate-100 text-xs text-slate-500">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <CameraIcon className="w-4 h-4 text-slate-400" />
                <span>Camera</span>
                <span className="text-slate-300">↓</span>
                <Router className="w-4 h-4 text-slate-400" />
                <span>Local Router</span>
                <span className="text-slate-300">↓</span>
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Internet</span>
                <span className="text-slate-300">↓</span>
                <Cloud className="w-4 h-4 text-emerald-500" />
                <span>Cloud Server</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">{STEPS[step].label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {["Give the camera a name and tell us where it's installed.",
                  "Enter the network details — just like adding a Wi-Fi device.",
                  "We'll check the camera is reachable and streaming.",
                  "Confirm the video stream is working.",
                  "Confirm pan/tilt/zoom works (if supported).",
                  "Confirm the camera's GPS location on the map.",
                  "Review and save the camera."][step]}
              </p>
            </div>

            {/* STEP 1 — Info */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Camera Name *</Label><Input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kaski Farm Camera 01" /></div>
                <div className="space-y-1.5"><Label>Camera ID</Label><Input className={input} value={form.camera_id} onChange={(e) => set("camera_id", e.target.value)} placeholder="Auto-generated" /></div>
                <div className="space-y-1.5"><Label>Camera Model *</Label>
                  <Select value={form.model} onValueChange={(v) => set("model", v)}>
                    <SelectTrigger className={input}><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.model === "Other IP Camera" && (
                  <div className="col-span-2 space-y-1.5"><Label>Custom Model Name</Label><Input className={input} value={form.custom_model} onChange={(e) => set("custom_model", e.target.value)} placeholder="e.g. Hikvision DS-2CD" /></div>
                )}
                <div className="space-y-1.5"><Label>Serial Number</Label><Input className={input} value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Location Name</Label><Input className={input} value={form.location_name} onChange={(e) => set("location_name", e.target.value)} placeholder="e.g. Sarangkot" /></div>
                <div className="col-span-2 space-y-1.5"><Label>Farm / Site</Label>
                  <Select value={form.site_id} onValueChange={(v) => set("site_id", v)}>
                    <SelectTrigger className={input}><SelectValue placeholder="Select an existing farm" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className={cn(input, "mt-1.5")} value={form.farm_name} onChange={(e) => set("farm_name", e.target.value)} placeholder="…or type a new farm name" />
                </div>
                <div className="space-y-1.5"><Label>Province</Label><Input className={input} value={form.province} onChange={(e) => set("province", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>District</Label><Input className={input} value={form.district} onChange={(e) => set("district", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Municipality</Label><Input className={input} value={form.municipality} onChange={(e) => set("municipality", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Ward</Label><Input className={input} value={form.ward} onChange={(e) => set("ward", e.target.value)} placeholder="e.g. 24" /></div>
                <div className="col-span-2 space-y-1.5"><Label>Installation Description</Label><Textarea rows={2} value={form.installation_description} onChange={(e) => set("installation_description", e.target.value)} placeholder="e.g. Pole-mounted at north field entrance" /></div>
              </div>
            )}

            {/* STEP 2 — Network */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 flex items-center justify-around text-xs text-slate-600">
                  <div className="flex flex-col items-center gap-1"><CameraIcon className="w-4 h-4 text-emerald-600" /> Camera</div>
                  <span className="text-slate-300">↓</span>
                  <div className="flex flex-col items-center gap-1"><Router className="w-4 h-4 text-emerald-600" /> Router</div>
                  <span className="text-slate-300">↓</span>
                  <div className="flex flex-col items-center gap-1"><Globe className="w-4 h-4 text-emerald-600" /> Internet</div>
                  <span className="text-slate-300">↓</span>
                  <div className="flex flex-col items-center gap-1"><Cloud className="w-4 h-4 text-emerald-600" /> Cloud</div>
                </div>
                <div className="space-y-1.5"><Label>Camera IP Address</Label><Input className={input} value={form.ip_address} onChange={(e) => set("ip_address", e.target.value)} placeholder="192.168.1.108" /></div>
                <div className="space-y-1.5"><Label>RTSP Port</Label><Input type="number" className={input} value={form.rtsp_port} onChange={(e) => set("rtsp_port", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>HTTP Port</Label><Input type="number" className={input} value={form.http_port} onChange={(e) => set("http_port", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>HTTPS Port</Label><Input type="number" className={input} value={form.https_port} onChange={(e) => set("https_port", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Username</Label><Input className={input} value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" className={input} value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" /></div>
                <div className="space-y-1.5"><Label>Router Name</Label><Input className={input} value={form.router_name} onChange={(e) => set("router_name", e.target.value)} placeholder="e.g. Kaski Router" /></div>
                <div className="space-y-1.5"><Label>Router IP</Label><Input className={input} value={form.router_ip} onChange={(e) => set("router_ip", e.target.value)} placeholder="192.168.1.1" /></div>
                <div className="col-span-2 space-y-1.5"><Label>Router Connection Type</Label>
                  <Select value={form.connection_type} onValueChange={(v) => set("connection_type", v)}>
                    <SelectTrigger className={input}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wifi">Wi-Fi</SelectItem>
                      <SelectItem value="ethernet">Ethernet</SelectItem>
                      <SelectItem value="4g_5g">4G/5G Router</SelectItem>
                      <SelectItem value="fiber">Fiber Router</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Remote Access Method</Label>
                  <Select value={form.access_method} onValueChange={(v) => set("access_method", v)}>
                    <SelectTrigger className={input}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ddns">DDNS hostname</SelectItem>
                      <SelectItem value="static_ip">Static public IP</SelectItem>
                      <SelectItem value="dynamic_ip">Dynamic public IP</SelectItem>
                      <SelectItem value="port_forwarding">Port forwarding</SelectItem>
                      <SelectItem value="vpn">VPN / private network</SelectItem>
                      <SelectItem value="cloud_relay">Secure cloud relay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>External Host / DDNS</Label><Input className={input} value={form.external_host} onChange={(e) => set("external_host", e.target.value)} placeholder="example.ddns.net" /></div>
                <div className="space-y-1.5"><Label>External RTSP Port</Label><Input type="number" className={input} value={form.external_rtsp_port} onChange={(e) => set("external_rtsp_port", e.target.value)} /></div>
              </div>
            )}

            {/* STEP 3 — Connection test */}
            {step === 2 && (
              <div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={runTest} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  {testing ? "Testing…" : "Test Camera Connection"}
                </Button>
                {testResult && (
                  <div className={cn("mt-4 rounded-xl border p-4", testResult.success ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}>
                    {testResult.success ? (
                      <div className="flex items-start gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <p className="font-medium text-emerald-700">Camera connected successfully</p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-700">Connection issue detected</p>
                          <p className="text-sm text-amber-700/80 mt-0.5">{friendlyError(testResult)}</p>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      {connectionChecks.map((c, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-black/5 py-1.5">
                          <span className="text-sm text-slate-600">{c.label}</span>
                          {c.value ? <span className="text-sm font-medium text-slate-700">{c.value}</span> : <StatusDot state={c.state} label="" />}
                        </div>
                      ))}
                    </div>
                    {!testResult.success && (
                      <Button variant="outline" className="mt-3" onClick={runTest} disabled={testing}>
                        <ShieldCheck className="w-4 h-4 mr-2" /> Retry Connection
                      </Button>
                    )}
                  </div>
                )}
                {!testResult && (
                  <p className="text-xs text-slate-400 mt-3">This checks the camera is reachable, the login is correct, and the video stream can be opened.</p>
                )}
              </div>
            )}

            {/* STEP 4 — Video test */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3"><Video className="w-4 h-4 text-emerald-600" /><span className="font-medium text-slate-700 text-sm">Video Stream</span></div>
                  {testResult?.success ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Video stream is available and accepted by the gateway.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> Complete the connection test first, or save the camera and verify in Live View.
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Full live preview opens in the Live View page once the camera is saved and the streaming gateway is configured.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Resolution</Label><Input className={input} value={form.resolution} onChange={(e) => set("resolution", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>FPS</Label><Input type="number" className={input} value={form.fps} onChange={(e) => set("fps", e.target.value)} /></div>
                  <div className="flex items-end gap-2 pb-1.5"><Switch checked={form.recording_enabled} onCheckedChange={(v) => set("recording_enabled", v)} /><span className="text-sm text-slate-600">Recording</span></div>
                </div>
              </div>
            )}

            {/* STEP 5 — PTZ test */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div><div className="font-medium text-slate-700 text-sm">This camera supports PTZ</div><div className="text-xs text-slate-400">Pan / Tilt / Zoom control</div></div>
                  <Switch checked={form.ptz_support} onCheckedChange={(v) => set("ptz_support", v)} />
                </div>
                {form.ptz_support ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-600 mb-3">Using the camera's own app, test that it can pan left and right. Does the camera move?</p>
                    <div className="flex gap-2">
                      <Button variant={ptzConfirmed === true ? "default" : "outline"} className={cn(ptzConfirmed === true && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => setPtzConfirmed(true)}>
                        <Check className="w-4 h-4 mr-1.5" /> Yes, it moves
                      </Button>
                      <Button variant={ptzConfirmed === false ? "default" : "outline"} className={cn(ptzConfirmed === false && "bg-amber-600 hover:bg-amber-700")} onClick={() => setPtzConfirmed(false)}>
                        <XCircle className="w-4 h-4 mr-1.5" /> No movement
                      </Button>
                    </div>
                    {ptzConfirmed === false && <p className="text-xs text-amber-600 mt-2">PTZ may need ONVIF enabled on the camera. You can still save — PTZ controls will be hidden for this camera.</p>}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    PTZ test skipped — this is a fixed camera. PTZ controls will be hidden.
                  </div>
                )}
              </div>
            )}

            {/* STEP 6 — Location */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>GPS Latitude</Label><Input className={input} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>GPS Longitude</Label><Input className={input} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} /></div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">Click the map to set the camera's exact position</div>
                  <LocationPicker lat={form.latitude} lng={form.longitude} onChange={(lat, lng) => { set("latitude", lat); set("longitude", lng); }} />
                </div>
              </div>
            )}

            {/* STEP 7 — Review & save */}
            {step === 6 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  <SummaryRow label="Camera" value={`${form.name} · ${resolvedModel}`} />
                  <SummaryRow label="Location" value={`${form.farm_name || "—"}, ${form.municipality}, ${form.district} · Ward ${form.ward || "—"}`} />
                  <SummaryRow label="Network" value={`${form.ip_address || "—"} : RTSP ${form.rtsp_port}`} />
                  <SummaryRow label="Remote access" value={`${form.access_method} · ${form.external_host || "—"}`} />
                  <SummaryRow label="Connection" value={testResult?.success ? "🟢 Connected" : testResult ? "🟡 Test pending" : "Not tested"} />
                  <SummaryRow label="PTZ" value={form.ptz_support ? (ptzConfirmed ? "🟢 Confirmed" : "🟡 Not confirmed") : "Not supported"} />
                  <SummaryRow label="GPS" value={`${form.latitude}, ${form.longitude}`} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><Switch checked={form.ai_detection} onCheckedChange={(v) => set("ai_detection", v)} /> AI Detection</label>
                  <label className="flex items-center gap-2"><Switch checked={form.night_vision} onCheckedChange={(v) => set("night_vision", v)} /> Night Vision</label>
                  <label className="flex items-center gap-2"><Switch checked={form.audio_enabled} onCheckedChange={(v) => set("audio_enabled", v)} /> Audio</label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_demo} onCheckedChange={(v) => set("is_demo", v)} /> Demo record</label>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Saving…" : "Save Camera"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <span className="text-xs text-slate-400">Press Save Camera to finish</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}