import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, CheckCircle2, Clock3, Lightbulb, Loader2, RefreshCw, ShieldCheck, Volume2, Wifi, WifiOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

async function apiRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

const commandStatus = {
  queued: { label: "आदेश पठाइयो", detail: "Controller को प्रतीक्षामा", className: "bg-amber-50 text-amber-800 border-amber-100", icon: Clock3 },
  sent: { label: "Controller मा पुग्यो", detail: "उपकरणको पुष्टि आउँदैछ", className: "bg-blue-50 text-blue-800 border-blue-100", icon: Activity },
  acknowledged: { label: "Controller बाट पुष्टि भयो", detail: "Acknowledgement प्राप्त भयो", className: "bg-emerald-50 text-emerald-800 border-emerald-100", icon: CheckCircle2 },
  failed: { label: "आदेश पूरा भएन", detail: "Controller ले असफल भएको जनायो", className: "bg-red-50 text-red-800 border-red-100", icon: WifiOff },
  expired: { label: "आदेशको समय सकियो", detail: "नयाँ आदेश पठाएर पुनः प्रयास गर्नुहोस्", className: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock3 },
};

export default function FarmDeviceControl() {
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");
  const [lastCommand, setLastCommand] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try { setControllers(await apiRequest("/api/iot/controllers")); }
    catch (error) { toast({ title: "उपकरण विवरण प्राप्त भएन", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [toast]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!lastCommand || !["queued", "sent"].includes(lastCommand.status)) return undefined;
    const poll = async () => {
      try {
        const current = await apiRequest(`/api/iot/commands/${encodeURIComponent(lastCommand.command_id)}`);
        setLastCommand((previous) => previous?.command_id === current.command_id ? { ...previous, ...current } : previous);
      } catch { /* Keep the last known state if the network is temporarily unavailable. */ }
    };
    const timer = window.setInterval(poll, 2500);
    return () => window.clearInterval(timer);
  }, [lastCommand]);

  const send = async (controller, command, action) => {
    if (command === "siren" && !window.confirm("आफ्नो फार्मको साइरन ५ सेकेन्ड बजाउने? वरिपरि मानिस, बालबालिका र जनावरको अवस्था जाँच गर्नुहोस्।")) return;
    const key = controller.controller_id + ":" + command + ":" + action;
    setBusy(key);
    try {
      const result = await apiRequest(`/api/iot/controllers/${encodeURIComponent(controller.controller_id)}/commands`, {
        method: "POST",
        body: JSON.stringify(command === "siren" ? { command, action, duration_seconds: 5 } : { command, action }),
      });
      setLastCommand({ ...result, controller: controller.label, command, action });
      toast({ title: "आदेश पठाइएको छ", description: "Controller बाट पुष्टि आउन बाँकी छ।" });
    } catch (error) {
      toast({ title: "आदेश पठाउन सकिएन", description: error.message, variant: "destructive" });
    } finally { setBusy(""); }
  };

  return <div className="mx-auto w-full max-w-5xl space-y-5 pb-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Link to="/my-farm" aria-label="फार्म ड्यासबोर्डमा फर्कनुहोस्" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"><ArrowLeft className="h-5 w-5" /></Link><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">SMART FARM CONTROL</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">मेरो उपकरण</h1></div></div>
      <Button variant="outline" size="sm" disabled={refreshing} onClick={() => load()} className="h-10 rounded-xl"><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>
    </div>

    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#12372c] via-[#164b3b] to-[#1d6550] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-100"><Activity className="h-3.5 w-3.5" /> LIVE DEVICE PANEL</span><h2 className="mt-3 text-2xl font-semibold tracking-tight">फार्म सुरक्षा नियन्त्रण</h2><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">आफ्नो फार्ममा जडान भएका उपकरण मात्र यहाँ देखिन्छन्। आदेश पठाउनु अघि वरिपरिको अवस्था जाँच गर्नुहोस्।</p></div><span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex"><Zap className="h-7 w-7 text-emerald-200" /></span></div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-white/10 px-3 py-2">🔊 साइरन · ५ सेकेन्ड</span><span className="rounded-lg bg-white/10 px-3 py-2">💡 बत्ती · ON / OFF</span><span className="rounded-lg bg-white/10 px-3 py-2">🔒 फार्म अनुसार पहुँच</span></div>
    </section>

    {lastCommand && (() => { const state = commandStatus[lastCommand.status] || commandStatus.queued; const StatusIcon = state.icon; return <section aria-live="polite" className={`rounded-2xl border p-4 ${state.className}`}><div className="flex items-start gap-3"><span className="mt-0.5"><StatusIcon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{state.label}</p><p className="mt-0.5 text-xs opacity-80">{lastCommand.controller || "तपाईंको Controller"} · {lastCommand.command === "siren" ? "साइरन" : "बत्ती"} · {lastCommand.action}</p><p className="mt-1 text-xs opacity-80">{state.detail}</p></div><span className="text-[10px] font-semibold uppercase">{lastCommand.status}</span></div></section>; })()}

    {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div>
      : controllers.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><WifiOff className="h-7 w-7" /></span><h2 className="mt-4 text-lg font-semibold text-slate-900">अहिलेसम्म उपकरण जोडिएको छैन</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">प्रशासकले तपाईंको प्रयोगकर्ता खाता सही फार्मसँग जोडेर ESP32 Controller दर्ता गरेपछि यहाँ देखिनेछ।</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link to="/my-farm">फार्म ड्यासबोर्डमा फर्कनुहोस्</Link></Button></section>
      : <div className="grid gap-4 md:grid-cols-2">{controllers.map((controller) => {
        const online = controller.status === "online";
        const sirenKey = controller.controller_id + ":siren:pulse";
        const lightOnKey = controller.controller_id + ":light:on";
        const lightOffKey = controller.controller_id + ":light:off";
        return <section key={controller.controller_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Activity className="h-6 w-6" /></span><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-900">{controller.label}</h2><p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{controller.controller_id}</p></div></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Online" : "Offline"}</span></div><p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> अन्तिम सम्पर्क: {controller.last_seen_at ? new Date(controller.last_seen_at).toLocaleString("ne-NP") : "अहिलेसम्म सम्पर्क भएको छैन"}</p></div>
          <div className="p-5 sm:p-6"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">उपकरण सञ्चालन गर्नुहोस्</p><div className="grid grid-cols-2 gap-3">
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "siren", "pulse")} className="h-[76px] flex-col gap-1 rounded-xl bg-amber-500 text-white shadow-sm hover:bg-amber-600"><Volume2 className="h-6 w-6" /><span className="text-sm font-semibold">साइरन बजाउनुहोस्</span><span className="text-[10px] font-normal opacity-85">५ सेकेन्ड</span>{busy === sirenKey && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}</Button>
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "light", "on")} className="h-[76px] flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-none hover:bg-emerald-100"><Lightbulb className="h-6 w-6" /><span className="text-sm font-semibold">बत्ती बाल्नुहोस्</span><span className="text-[10px] font-normal text-emerald-700">LIGHT ON</span>{busy === lightOnKey && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}</Button>
            <Button disabled={!online || Boolean(busy)} onClick={() => send(controller, "light", "off")} variant="outline" className="col-span-2 h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"><Lightbulb className="mr-2 h-4 w-4" /> बत्ती निभाउनुहोस् · LIGHT OFF {busy === lightOffKey && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}</Button>
          </div>
          {!online && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">Controller Offline छ। इन्टरनेट वा विद्युत् आपूर्ति जाँच नगरी आदेश पठाउन मिल्दैन।</p>}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/80 p-3 text-xs leading-5 text-blue-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>आदेश Controller ले स्वीकार गरेको पुष्टि आएपछि मात्र सफल मानिन्छ।</span></div>
          </div>
        </section>;
      })}</div>}

    <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">सुरक्षा सम्बन्धी जानकारी</p><p className="mt-1 text-xs leading-5 text-amber-900/85">यो Pilot मा साइरन र बत्ती मात्र उपलब्ध छन्। High-voltage electric fence को Remote Control हाल बन्द छ। कुनै पनि उपकरण चलाउनु अघि मानिस, बालबालिका, घरपालुवा जनावर र वन्यजन्तुको अवस्थालाई ध्यान दिनुहोस्।</p></div></section>
  </div>;
}
