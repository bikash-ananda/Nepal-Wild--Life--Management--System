import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptyForm = { bridge_port: "", username: "", password: "", ptz_enabled: true, siren_control_enabled: false, light_control_enabled: false };

// Admin/technician setup for the dh-fwd P2P control tunnel. Video is unaffected (it arrives by RTMP).
export default function P2PControlSetup({ cameraId, onChanged }) {
  const [state, setState] = useState({ loading: true, enabled: false, range: null, deterrenceAllowed: false, tunnel: null });
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const info = await api.cameras.controlTunnel.get(cameraId);
      setState({ loading: false, enabled: info.enabled, range: info.port_range, deterrenceAllowed: info.deterrence_allowed, tunnel: info.tunnel });
      if (info.tunnel) {
        setForm({ ...emptyForm, bridge_port: String(info.tunnel.bridge_port), username: info.tunnel.username, ptz_enabled: info.tunnel.ptz_enabled, siren_control_enabled: info.tunnel.siren_control_enabled, light_control_enabled: info.tunnel.light_control_enabled });
      }
    } catch (cause) {
      setState((current) => ({ ...current, loading: false }));
      setMessage(cause.message || "Could not load the control tunnel profile.");
    }
  }, [cameraId]);

  useEffect(() => { void load(); }, [load]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const run = async (name, action, success) => {
    setBusy(name);
    setMessage("");
    try {
      const result = await action();
      setMessage(typeof success === "function" ? success(result) : success);
      await load();
      if (onChanged) await onChanged();
    } catch (cause) {
      setMessage(cause.message || "The request failed.");
    } finally {
      setBusy("");
    }
  };

  const save = () => run("save", () => api.cameras.controlTunnel.save(cameraId, { ...form, bridge_port: Number(form.bridge_port) }), "Control profile saved. Run the connection test next.");
  const test = () => run("test", () => api.cameras.controlTunnel.test(cameraId), (result) => `Camera reached through the tunnel${result.device ? `: ${result.device}` : "."}`);
  const remove = () => run("remove", () => api.cameras.controlTunnel.remove(cameraId), "Control profile removed.");

  if (state.loading) return null;

  return <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <summary className="cursor-pointer font-semibold text-slate-900">Remote control tunnel (P2P)</summary>
    {!state.enabled ? <p className="mt-3 text-sm text-slate-600">The P2P control tunnel is not enabled on this server. Set <code>CAMERA_P2P_PORT_RANGE</code> and start the <code>dh-fwd</code> service first.</p> : <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-slate-500">Controls reach the camera's HTTP port through the private dh-fwd bridge. Video is not carried by this tunnel. Use a dedicated camera account with only the permissions you need.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-600">Bridge port ({state.range?.low}–{state.range?.high})<Input inputMode="numeric" value={form.bridge_port} onChange={(event) => setField("bridge_port", event.target.value)} /></label>
        <label className="text-xs text-slate-600">Camera account<Input value={form.username} onChange={(event) => setField("username", event.target.value)} autoCapitalize="none" autoCorrect="off" /></label>
        <label className="text-xs text-slate-600">Camera password<Input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={state.tunnel?.has_password ? "Saved (leave blank to keep)" : ""} autoComplete="new-password" /></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.ptz_enabled} onChange={(event) => setField("ptz_enabled", event.target.checked)} />Manual pan/tilt</label>
        {state.deterrenceAllowed && <label className="flex items-center gap-2"><input type="checkbox" checked={form.light_control_enabled} onChange={(event) => setField("light_control_enabled", event.target.checked)} />Manual warning light</label>}
        {state.deterrenceAllowed && <label className="flex items-center gap-2"><input type="checkbox" checked={form.siren_control_enabled} onChange={(event) => setField("siren_control_enabled", event.target.checked)} />Manual siren</label>}
      </div>
      {!state.deterrenceAllowed && <p className="text-xs text-slate-500">Siren and light controls are disabled on this server for the research pilot.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={Boolean(busy)}>{busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save profile</Button>
        <Button type="button" variant="outline" onClick={test} disabled={Boolean(busy) || !state.tunnel}>{busy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Test connection</Button>
        {state.tunnel && <Button type="button" variant="outline" onClick={remove} disabled={Boolean(busy)}>Remove</Button>}
      </div>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
  </details>;
}
