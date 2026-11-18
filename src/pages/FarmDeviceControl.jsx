import React, { useCallback, useEffect, useState } from "react";
import { Activity, Lightbulb, Loader2, RefreshCw, ShieldAlert, Volume2, Wifi, WifiOff } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

async function apiRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function FarmDeviceControl() {
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [lastCommand, setLastCommand] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try { setControllers(await apiRequest("/api/iot/controllers")); }
    catch (error) { toast({ title: "Could not load farm devices", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const send = async (controller, command, action) => {
    if (command === "siren" && !window.confirm("५ सेकेन्डका लागि आफ्नो फार्मको Siren बजाउने? वरिपरि मानिस, बालबालिका र जनावरको अवस्था जाँच गर्नुहोस्।")) return;
    const key = controller.controller_id + ":" + command;
    setBusy(key);
    try {
      const result = await apiRequest(`/api/iot/controllers/${encodeURIComponent(controller.controller_id)}/commands`, {
        method: "POST",
        body: JSON.stringify(command === "siren" ? { command, action, duration_seconds: 5 } : { command, action }),
      });
      setLastCommand({ ...result, controller: controller.label, command, action });
      toast({ title: "Command queued", description: "Controller acknowledgement pending. If firmware is not yet connected, this command will expire automatically." });
    } catch (error) {
      toast({ title: "Command not sent", description: error.message, variant: "destructive" });
    } finally { setBusy(""); }
  };

  return <div className="mx-auto max-w-5xl">
    <PageHeader title="My Farm Devices" description="Only controllers assigned to your permitted farm sites are shown here." icon={Activity}
      actions={<Button variant="outline" onClick={() => { setLoading(true); load(); }}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>} />
    <div className="mb-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <ShieldAlert className="h-5 w-5 shrink-0" />
      <p>साइरन र बत्तीका आदेश मात्र उपलब्ध छन्। आदेश पठाउँदा पनि Controller ले स्वीकार गरेको प्रमाण नआएसम्म उपकरण चलेको मानिँदैन। Electric Fence / High Voltage नियन्त्रण यस Pilot मा बन्द छ।</p>
    </div>
    {lastCommand && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm"><strong>Last command:</strong> {lastCommand.command} · {lastCommand.action} · {lastCommand.status} · {lastCommand.command_id}</div>}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      : controllers.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><WifiOff className="mx-auto mb-3 h-9 w-9 text-slate-400" /><h2 className="font-semibold text-slate-800">No farm controller assigned</h2><p className="mt-1 text-sm text-slate-500">Ask the WLMS administrator to connect your account to the correct farm and register its ESP32 controller.</p></div>
      : <div className="grid gap-4 md:grid-cols-2">{controllers.map((controller) => {
        const online = controller.status === "online";
        return <section key={controller.controller_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{controller.label}</h2><p className="mt-1 font-mono text-xs text-slate-500">{controller.controller_id}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Online" : "Offline"}</span></div>
          <p className="mt-3 text-xs text-slate-500">Last contact: {controller.last_seen_at ? new Date(controller.last_seen_at).toLocaleString() : "Not connected yet"}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "siren", "pulse")} className="h-14 bg-amber-600 hover:bg-amber-700"><Volume2 className="mr-2 h-5 w-5" /> Siren · 5 sec</Button>
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "light", "on")} variant="outline" className="h-14"><Lightbulb className="mr-2 h-5 w-5" /> Light ON</Button>
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "light", "off")} variant="outline" className="col-span-2 h-12">Light OFF</Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Capabilities: {Object.entries(controller.capabilities || {}).filter(([, value]) => value).map(([key]) => key).join(", ") || "Not reported"}</p>
        </section>;
      })}</div>}
  </div>;
}
