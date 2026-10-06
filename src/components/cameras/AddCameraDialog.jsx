import React, { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ShieldCheck, Network, KeyRound, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "", camera_id: "", brand: "UNIARCH", model: "P2S Dual-Lens",
  ip_address: "", rtsp_url: "", main_stream_url: "", sub_stream_url: "",
  username: "", password: "", onvif_support: true,
  codec: "H.264", resolution: "1920x1080", fps: 20,
  ptz_support: false, orientation: "", detection_zones: "",
  ai_detection: true, ai_detection_fps: 5, recording_enabled: false,
  webrtc_enabled: true, edge_device_id: "", site_id: "",
  latitude: "", longitude: "", is_demo: true,
};

export default function AddCameraDialog({ open, onOpenChange, sites, devices, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [advanced, setAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTest = async () => {
    if (!form.rtsp_url && !form.main_stream_url) {
      toast({ title: "RTSP URL is required to test connection", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("cameraGateway", {
        action: "testConnection",
        rtsp_url: form.rtsp_url,
        main_stream_url: form.main_stream_url,
        sub_stream_url: form.sub_stream_url,
        ip_address: form.ip_address,
        username: form.username,
        password: form.password,
      });
      setTestResult(res.data);
      if (res.data?.success) toast({ title: "Camera connected successfully", variant: "success" });
      else toast({ title: res.data?.message || "Connection failed", variant: "destructive" });
    } catch (e) {
      setTestResult({ success: false, message: e.message || "Request failed" });
      toast({ title: "Connection test failed", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.site_id) {
      toast({ title: "Camera name and installation site are required", variant: "destructive" });
      return;
    }
    const site = sites.find((s) => s.id === form.site_id);
    const device = devices.find((d) => d.id === form.edge_device_id);
    const camId = form.camera_id || ("CAM-" + Date.now().toString(36).toUpperCase());
    try {
      await base44.entities.Camera.create({
        name: form.name,
        camera_id: camId,
        site_id: form.site_id,
        site_name: site?.name || "",
        brand: form.brand,
        model: form.model,
        ip_address: form.ip_address,
        rtsp_url: form.rtsp_url,
        main_stream_url: form.main_stream_url,
        sub_stream_url: form.sub_stream_url,
        username: form.username,
        encrypted_password: form.password ? `enc:${btoa(form.password)}` : "",
        onvif_support: form.onvif_support,
        codec: form.codec,
        resolution: form.resolution,
        fps: Number(form.fps),
        ptz_support: form.ptz_support,
        orientation: form.orientation,
        detection_zones: form.detection_zones
          ? form.detection_zones.split(",").map((z) => ({ name: z.trim(), active: true }))
          : [],
        ai_detection: form.ai_detection,
        ai_detection_fps: Number(form.ai_detection_fps),
        recording_enabled: form.recording_enabled,
        webrtc_enabled: form.webrtc_enabled,
        edge_device_id: form.edge_device_id || undefined,
        edge_device_name: device?.name || "",
        latitude: form.latitude ? Number(form.latitude) : site?.latitude,
        longitude: form.longitude ? Number(form.longitude) : site?.longitude,
        online_status: "online",
        health_status: "healthy",
        stream_status: "offline",
        ai_status: form.ai_detection ? "idle" : "disabled",
        installation_date: new Date().toISOString().slice(0, 10),
        last_heartbeat: new Date().toISOString(),
        is_demo: form.is_demo,
      });
      toast({ title: "Camera registered", variant: "success" });
      onOpenChange(false);
      setForm(emptyForm);
      setTestResult(null);
      onCreated && onCreated();
    } catch (e) {
      toast({ title: "Failed to register camera", variant: "destructive" });
    }
  };

  const inputCls = "h-9";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register IP Camera</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Camera Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarangkot Cam 01" />
          </div>
          <div className="space-y-1.5">
            <Label>Camera ID</Label>
            <Input value={form.camera_id} onChange={(e) => set("camera_id", e.target.value)} placeholder="Auto-generated" />
          </div>
          <div className="space-y-1.5">
            <Label>Installation Site *</Label>
            <Select value={form.site_id} onValueChange={(v) => set("site_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>IP Address / Hostname</Label>
            <Input value={form.ip_address} onChange={(e) => set("ip_address", e.target.value)} placeholder="192.168.1.100" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>RTSP URL</Label>
            <Input value={form.rtsp_url} onChange={(e) => set("rtsp_url", e.target.value)} placeholder="rtsp://ip:554/stream" />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
          </div>

          {/* Test connection */}
          <div className="col-span-2">
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="w-full">
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
            {testResult && (
              <div className={cn(
                "mt-2 rounded-lg border p-3 text-sm",
                testResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
              )}>
                <div className="flex items-start gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                  <div>
                    <p className="font-medium">{testResult.message}</p>
                    {testResult.steps && (
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {testResult.steps.map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {s.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced settings */}
          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="col-span-2 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 mt-1"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", advanced && "rotate-180")} />
            Advanced Settings
          </button>

          {advanced && (
            <>
              <div className="col-span-2 space-y-1.5">
                <Label>Main Stream URL</Label>
                <Input value={form.main_stream_url} onChange={(e) => set("main_stream_url", e.target.value)} placeholder="rtsp://ip:554/Streaming/Channels/101" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Sub-stream URL</Label>
                <Input value={form.sub_stream_url} onChange={(e) => set("sub_stream_url", e.target.value)} placeholder="rtsp://ip:554/Streaming/Channels/102" />
              </div>
              <div className="space-y-1.5">
                <Label>Codec</Label>
                <Select value={form.codec} onValueChange={(v) => set("codec", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["H.264", "H.265", "MJPEG", "auto"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Resolution</Label>
                <Input value={form.resolution} onChange={(e) => set("resolution", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>FPS</Label>
                <Input type="number" value={form.fps} onChange={(e) => set("fps", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>AI Detection FPS</Label>
                <Input type="number" value={form.ai_detection_fps} onChange={(e) => set("ai_detection_fps", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>GPS Latitude</Label>
                <Input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>GPS Longitude</Label>
                <Input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Camera Orientation</Label>
                <Input value={form.orientation} onChange={(e) => set("orientation", e.target.value)} placeholder="North-facing, 45° down" />
              </div>
              <div className="space-y-1.5">
                <Label>Detection Zones (comma separated)</Label>
                <Input value={form.detection_zones} onChange={(e) => set("detection_zones", e.target.value)} placeholder="gate, field, forest edge" />
              </div>
              <div className="space-y-1.5">
                <Label>Associated Edge Device (Raspberry Pi)</Label>
                <Select value={form.edge_device_id} onValueChange={(v) => set("edge_device_id", v)}>
                  <SelectTrigger><SelectValue placeholder="None (optional)" /></SelectTrigger>
                  <SelectContent>
                    {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-wrap gap-5 py-2">
                <Toggle label="ONVIF" checked={form.onvif_support} onChange={(v) => set("onvif_support", v)} />
                <Toggle label="AI Detection" checked={form.ai_detection} onChange={(v) => set("ai_detection", v)} />
                <Toggle label="Recording" checked={form.recording_enabled} onChange={(v) => set("recording_enabled", v)} />
                <Toggle label="WebRTC" checked={form.webrtc_enabled} onChange={(v) => set("webrtc_enabled", v)} />
                <Toggle label="PTZ" checked={form.ptz_support} onChange={(v) => set("ptz_support", v)} />
                <Toggle label="Demo Record" checked={form.is_demo} onChange={(v) => set("is_demo", v)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Register Camera</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
}