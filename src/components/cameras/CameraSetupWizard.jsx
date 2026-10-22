import React, { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, CircleHelp, Loader2, LockKeyhole, MapPin, Network, Wifi } from "lucide-react";
import { api } from "@/api/apiClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const blankCamera = { name: "", camera_id: "", brand: "Dahua", model: "DH-P31-PV", serial_number: "", site_id: "", ward: "21", latitude: "", longitude: "", installation_description: "" };
const blankConnection = { network_mode: "public_forward", network_label: "Farm router 1", protocol: "rtsp", host: "", port: "554", stream_path: "", username: "", password: "", rtsp_transport: "tcp" };

const steps = ["Camera", "Network route", "Stream & test"];

export default function CameraSetupWizard({ open, onOpenChange, sites = [], onCreated, camera = null }) {
  const [form, setForm] = useState(blankCamera);
  const [connection, setConnection] = useState(blankConnection);
  const [step, setStep] = useState(1);
  const [testState, setTestState] = useState("idle");
  const [testMessage, setTestMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [noAuth, setNoAuth] = useState(false);
  const isEditing = Boolean(camera);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setForm(camera ? {
      name: camera.name || "", camera_id: camera.camera_id || "", brand: camera.brand || "Generic", model: camera.model || "",
      serial_number: camera.serial_number || "", site_id: String(camera.site_id || ""), ward: camera.ward || "",
      latitude: camera.latitude ?? "", longitude: camera.longitude ?? "", installation_description: camera.installation_description || "",
    } : blankCamera);
    setConnection(blankConnection);
    setStep(camera ? 2 : 1);
    setTestState("idle");
    setTestMessage("");
    setHasSavedPassword(false);
    setNoAuth(false);
    if (camera) {
      api.cameras.getConnection(camera.id).then((saved) => {
        if (cancelled || !saved?.configured) return;
        setConnection({
          network_mode: saved.network_mode || "public_forward", network_label: saved.network_label || "",
          protocol: saved.protocol || "rtsp", host: saved.host || "", port: String(saved.port || 554),
          stream_path: saved.stream_path || "", username: saved.username || "", password: "",
          rtsp_transport: saved.rtsp_transport || "tcp",
        });
        setHasSavedPassword(Boolean(saved.has_password));
        setNoAuth(!saved.has_password);
      }).catch((error) => {
        if (!cancelled) toast({ title: "Could not load the saved camera route", description: error.message, variant: "destructive" });
      });
    }
    return () => { cancelled = true; };
  }, [open, camera]);

  const site = useMemo(() => sites.find((item) => String(item.id) === String(form.site_id)), [sites, form.site_id]);
  const setCameraField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setConnectionField = (key, value) => {
    setConnection((current) => ({ ...current, [key]: value }));
    if (key === "password" && value) setNoAuth(false);
    setTestState("idle");
    setTestMessage("");
  };

  const validateIdentity = () => {
    if (!form.name.trim() || !site) {
      toast({ title: "Add a camera name and choose its research site", variant: "destructive" });
      return false;
    }
    const latitude = form.latitude === "" ? null : Number(form.latitude);
    const longitude = form.longitude === "" ? null : Number(form.longitude);
    if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))) {
      toast({ title: "Check the GPS coordinates", description: "Latitude must be between -90 and 90 and longitude between -180 and 180.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateConnection = () => {
    if (!connection.network_label.trim() || !connection.host.trim() || !connection.stream_path.trim()) {
      toast({ title: "Complete the network route and stream path", variant: "destructive" });
      return false;
    }
    if (!Number.isInteger(Number(connection.port)) || Number(connection.port) < 1 || Number(connection.port) > 65535) {
      toast({ title: "Enter a valid stream port", variant: "destructive" });
      return false;
    }
    if (!connection.password && !noAuth && !hasSavedPassword) {
      toast({ title: "Add camera credentials or confirm there is no password", variant: "destructive" });
      return false;
    }
    return true;
  };

  const toConnectionPayload = () => ({
    ...connection,
    port: Number(connection.port),
    username: connection.username.trim(),
    password: connection.password,
    allow_no_auth: noAuth,
  });

  const testConnection = async () => {
    if (!validateIdentity() || !validateConnection()) return;
    setBusy(true);
    setTestState("testing");
    setTestMessage("The VPS is checking this camera route and stream. This can take up to 15 seconds.");
    try {
      const result = await api.cameras.testConnection({ site_id: String(site.id), camera_id: camera?.id, connection: toConnectionPayload() });
      setTestState("success");
      setTestMessage(result.message || "The VPS received the camera stream.");
      toast({ title: "Camera route tested successfully", description: "The stream reached the VPS. Review the details and activate it." });
    } catch (error) {
      setTestState("error");
      setTestMessage(error.message || "The VPS could not read the stream.");
      toast({ title: "Camera test did not pass", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveActive = async () => {
    if (!validateIdentity() || !validateConnection()) return;
    if (testState !== "success") {
      toast({ title: "Test this camera before activating it", description: "The server will run a fresh test again when you save." });
      return;
    }
    setBusy(true);
    try {
      if (isEditing) {
        const saved = await api.cameras.configure(camera.id, toConnectionPayload());
        if (saved.state === "apply_failed") toast({ title: "Profile saved; stream service needs a retry", description: saved.last_error || "Open camera details and retry the server apply.", variant: "destructive" });
        else toast({ title: "Camera route applied", description: "The saved profile is available to authorized site users." });
      } else {
        const result = await api.cameras.setup({
          camera: {
            ...form,
            name: form.name.trim(),
            brand: form.brand.trim() || "Generic",
            model: form.model.trim(),
            site_id: String(site.id),
            site_name: site.name,
            latitude: form.latitude === "" ? null : Number(form.latitude),
            longitude: form.longitude === "" ? null : Number(form.longitude),
          },
          connection: toConnectionPayload(),
        });
        if (result.connection?.state === "apply_failed") toast({ title: "Camera added; stream service needs a retry", description: "Open camera details to retry applying the saved route.", variant: "destructive" });
        else toast({ title: "Camera added and route applied", description: "The camera now has its own network profile on the server." });
      }
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast({ title: "Could not apply camera setup", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveInventoryOnly = async () => {
    if (isEditing || !validateIdentity()) return;
    setBusy(true);
    try {
      await api.entities.Camera.create({
        name: form.name.trim(),
        camera_id: form.camera_id.trim() || `CAM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        brand: form.brand.trim() || "Generic", model: form.model.trim(), serial_number: form.serial_number.trim(),
        site_id: String(site.id), site_name: site.name, municipality: site.municipality || "Pokhara", district: site.district || "Kaski",
        ward: form.ward.trim() || site.ward || "", latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude), installation_description: form.installation_description.trim(),
      });
      toast({ title: "Camera saved to inventory", description: "You can configure its network route later." });
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast({ title: "Could not save camera", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    if (step === 1 && !validateIdentity()) return;
    if (step === 2 && !connection.network_label.trim()) {
      toast({ title: "Name this camera's router or network", variant: "destructive" });
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const streamPortHint = { rtsp: "554", rtsps: "322", http: "80", https: "443" }[connection.protocol] || "554";

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl"><Camera className="h-5 w-5 text-emerald-600" />{isEditing ? `Configure ${camera.name}` : "Add a farm camera"}</DialogTitle>
        <p className="text-sm text-slate-500">Each camera keeps its own site, router path, stream protocol, and encrypted credentials.</p>
      </DialogHeader>

      {!isEditing && <nav aria-label="Camera setup steps" className="grid grid-cols-3 gap-2">
        {steps.map((title, index) => {
          const number = index + 1;
          return <button key={title} type="button" onClick={() => number < step && setStep(number)} className={`rounded-xl border px-3 py-2 text-left text-xs sm:text-sm ${step === number ? "border-emerald-600 bg-emerald-50 text-emerald-800" : number < step ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold">{number < step ? "✓" : number}</span>{title}
          </button>;
        })}
      </nav>}

      {(!isEditing && step === 1) && <section className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>Tell us which farm camera this is and which site should receive its events. GPS is optional; you can add it from the farm location.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Camera name" required><Input value={form.name} onChange={(event) => setCameraField("name", event.target.value)} placeholder="North field entrance" autoFocus /></Field>
          <Field label="Research site" required><Select value={form.site_id} onValueChange={(value) => setCameraField("site_id", value)}><SelectTrigger><SelectValue placeholder="Choose a site" /></SelectTrigger><SelectContent>{sites.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name || item.id}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Manufacturer"><Input value={form.brand} onChange={(event) => setCameraField("brand", event.target.value)} placeholder="Dahua, Hikvision, Reolink…" /></Field>
          <Field label="Model"><Input value={form.model} onChange={(event) => setCameraField("model", event.target.value)} placeholder="Camera model" /></Field>
          <Field label="Farm camera label"><Input value={form.camera_id} onChange={(event) => setCameraField("camera_id", event.target.value)} placeholder="CAM-POK21-NORTH (optional)" /></Field>
          <Field label="Serial number"><Input value={form.serial_number} onChange={(event) => setCameraField("serial_number", event.target.value)} placeholder="Optional" /></Field>
          <Field label="Ward"><Input value={form.ward} onChange={(event) => setCameraField("ward", event.target.value)} placeholder="21" /></Field>
          <Field label="GPS coordinates"><div className="grid grid-cols-2 gap-2"><Input aria-label="Latitude" inputMode="decimal" value={form.latitude} onChange={(event) => setCameraField("latitude", event.target.value)} placeholder="Latitude" /><Input aria-label="Longitude" inputMode="decimal" value={form.longitude} onChange={(event) => setCameraField("longitude", event.target.value)} placeholder="Longitude" /></div></Field>
        </div>
        <Field label="Installation note"><Input value={form.installation_description} onChange={(event) => setCameraField("installation_description", event.target.value)} placeholder="Facing the crop boundary; mounted on the east pole" /></Field>
      </section>}

      {(isEditing || step === 2) && <section className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"><Network className="mt-0.5 h-4 w-4 shrink-0" /><p>Describe how <strong>this camera</strong> reaches the VPS. Different cameras can use different routers and routes; enter the public/DDNS address and mapped port for this camera only.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Connection route" required><Select value={connection.network_mode} onValueChange={(value) => setConnectionField("network_mode", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public_forward">Router port forward / DDNS</SelectItem><SelectItem value="vpn_routed">Private network through VPN</SelectItem></SelectContent></Select></Field>
          <Field label="Router or network name" required><Input value={connection.network_label} onChange={(event) => setConnectionField("network_label", event.target.value)} placeholder="Farm North / Router 1" /></Field>
          <Field label={connection.network_mode === "public_forward" ? "Public IP or DDNS host" : "Camera IP on the VPN network"} required><Input value={connection.host} onChange={(event) => setConnectionField("host", event.target.value)} placeholder={connection.network_mode === "public_forward" ? "farm-north.example.net" : "10.20.1.25"} autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Forwarded / camera port" required><Input inputMode="numeric" value={connection.port} onChange={(event) => setConnectionField("port", event.target.value)} placeholder={streamPortHint} /></Field>
        </div>
        {connection.network_mode === "public_forward" ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Router safety:</strong> forward only the camera's stream port and allowlist the VPS source IP <code>169.58.25.131</code> on the router if supported. Do not expose the camera's admin web interface. If cameras share one public address, assign each its own external port.</div> : <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-950">The server must already have a site-to-site VPN route to this farm. Its address range also needs to be allowed in <code>CAMERA_VPN_CIDRS</code> on the VPS.</div>}
      </section>}

      {(isEditing || step === 3) && <section className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Wifi className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>The server tests the source, then saves its own path in the streaming service. Camera usernames and passwords stay encrypted on the server.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stream type" required><Select value={connection.protocol} onValueChange={(value) => { setConnectionField("protocol", value); setConnectionField("port", ({ rtsp: "554", rtsps: "322", http: "80", https: "443" })[value]); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rtsp">RTSP</SelectItem><SelectItem value="rtsps">Secure RTSP (RTSPS)</SelectItem><SelectItem value="http">HLS over HTTP</SelectItem><SelectItem value="https">HLS over HTTPS</SelectItem></SelectContent></Select></Field>
          <Field label="Stream transport"><Select value={connection.rtsp_transport} onValueChange={(value) => setConnectionField("rtsp_transport", value)} disabled={!['rtsp', 'rtsps'].includes(connection.protocol)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tcp">TCP (recommended for routed networks)</SelectItem><SelectItem value="udp">UDP</SelectItem></SelectContent></Select></Field>
          <Field label="Stream path" required><Input value={connection.stream_path} onChange={(event) => setConnectionField("stream_path", event.target.value)} placeholder={connection.protocol === "rtsp" ? "/cam/realmonitor?channel=1&subtype=1" : "/live/stream.m3u8"} autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Camera username"><Input value={connection.username} onChange={(event) => setConnectionField("username", event.target.value)} placeholder="Dedicated read-only camera user" autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label={isEditing && hasSavedPassword ? "Camera password (optional)" : "Camera password"}><Input type="password" value={connection.password} onChange={(event) => setConnectionField("password", event.target.value)} placeholder={isEditing && hasSavedPassword ? "Leave blank to keep the saved password" : "Enter the camera account password"} autoComplete="new-password" disabled={noAuth} /></Field>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={noAuth} onChange={(event) => { setNoAuth(event.target.checked); if (event.target.checked) setConnectionField("password", ""); }} className="mt-0.5 rounded border-slate-300" /><span>This stream has no camera password. Use this only if the camera does not require a login.</span></label>
        <div className="flex items-start gap-2 text-xs text-slate-500"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Use a camera account with stream viewing permission only. Never paste a full RTSP URL containing the username or password.</p></div>
        {testMessage && <div role="status" className={`flex items-start gap-2 rounded-xl p-3 text-sm ${testState === "success" ? "bg-emerald-50 text-emerald-900" : testState === "error" ? "bg-rose-50 text-rose-900" : "bg-sky-50 text-sky-900"}`}>{testState === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : testState === "testing" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />}<p>{testMessage}</p></div>}
        <Button type="button" variant="outline" className="w-full" onClick={testConnection} disabled={busy}>{busy && testState === "testing" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing from VPS…</> : "Test this camera from the VPS"}</Button>
      </section>}

      <DialogFooter className="gap-2 sm:justify-between">
        <div className="flex gap-2">
          {!isEditing && step > 1 && <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={busy}>Back</Button>}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!isEditing && step === 1 && <Button type="button" variant="outline" onClick={saveInventoryOnly} disabled={busy}>Save inventory only</Button>}
          {!isEditing && step < 3 && <Button type="button" onClick={goNext} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">Continue</Button>}
          {(isEditing || step === 3) && <Button type="button" onClick={saveActive} disabled={busy || testState !== "success"} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Applying…" : isEditing ? "Save and apply route" : "Add camera and activate"}</Button>}
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function Field({ label, required, children }) {
  const id = React.useId();
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}{required && <span className="ml-1 text-rose-600" aria-label="required">*</span>}</Label>{React.cloneElement(children, { id: children.props.id || id })}</div>;
}
