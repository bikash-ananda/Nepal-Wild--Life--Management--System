import React, { useCallback, useEffect, useState } from "react";
import { Copy, Cpu, KeyRound, Loader2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function IotControllerManager() {
  const [sites, setSites] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [label, setLabel] = useState("");
  const [controllerId, setControllerId] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [siteRows, deviceRows] = await Promise.all([api.entities.Site.list(), request("/api/iot/controllers")]);
      setSites(siteRows); setControllers(deviceRows);
    } catch (error) { toast({ title: "Could not load IoT registry", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [siteId, toast]);

  useEffect(() => { load(); }, [load]);

  const provision = async () => {
    setSaving(true); setToken("");
    try {
      const result = await request("/api/iot/controllers", { method: "POST", body: JSON.stringify({ site_id: siteId, label, controller_id: controllerId }) });
      setToken(result.device_token);
      toast({ title: "Controller registered", description: "Copy the device token now. It is shown only once." });
      await load();
    } catch (error) { toast({ title: "Registration failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-5xl">
    <PageHeader title="ESP32 Controller Registry" description="Register multiple uniquely identified controllers under each farm site." icon={Cpu}
      actions={<Button variant="outline" onClick={() => { setLoading(true); load(); }}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>} />
    <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><ShieldAlert className="h-5 w-5 shrink-0" /><p>Device tokens are secrets. Copy them directly into the intended controller's secure configuration; never share them in screenshots or public messages. Only Siren and Light command types are enabled. Electric Fence commands are not supported.</p></div>
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Register a controller</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Farm / Site</Label><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={siteId} onChange={(event) => setSiteId(event.target.value)}><option value="">Select site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name || site.id}</option>)}</select></div>
        <div className="space-y-1.5"><Label>Controller name</Label><Input value={label} onChange={(event) => setLabel(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>Unique Controller ID</Label><Input value={controllerId} onChange={(event) => setControllerId(event.target.value)} /></div>
      </div>
      <Button className="mt-4" disabled={!siteId || !label.trim() || !controllerId.trim() || saving} onClick={provision}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Register ESP32</Button>
      {token && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="mb-2 flex items-center gap-2 font-semibold text-emerald-900"><KeyRound className="h-4 w-4" /> One-time device token</div><code className="block break-all rounded bg-white p-3 text-xs">{token}</code><Button variant="outline" className="mt-3" onClick={() => navigator.clipboard?.writeText(token).then(() => toast({ title: "Token copied" })).catch(() => toast({ title: "Select and copy the token manually" }))}><Copy className="mr-2 h-4 w-4" /> Copy token</Button><p className="mt-2 text-xs text-emerald-900">यो token फेरि देखाइने छैन। Firmware मा सुरक्षित रूपमा राखेपछि यो प्यानल बन्द गर्नुहोस्।</p></div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Registered controllers</h2>
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : controllers.length ? <div className="divide-y divide-slate-100">{controllers.map((item) => <div key={item.controller_id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><div className="font-medium">{item.label}</div><div className="font-mono text-xs text-slate-500">{item.controller_id} · Site {item.site_id}</div></div><span className={`rounded-full px-2 py-1 text-xs ${item.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></div>)}</div> : <p className="text-sm text-slate-500">No controllers registered yet.</p>}
    </section>
  </div>;
}
