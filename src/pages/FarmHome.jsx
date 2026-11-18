import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Bell, Camera, ChevronRight, Leaf, Map, RadioTower, ShieldCheck, Wifi, WifiOff, Zap } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

async function getControllers() {
  const response = await fetch("/api/iot/controllers", { credentials: "include" });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.error || "Could not load farm devices");
  return Array.isArray(data) ? data : [];
}

export default function FarmHome() {
  const { user } = useAuth();
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setControllers(await getControllers()); setError(""); }
    catch (err) { setError(err.message || "Connection problem"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const online = controllers.filter((item) => item.status === "online").length;
  const offline = controllers.length - online;
  const firstName = (user?.full_name || "").trim().split(/\s+/)[0] || "किसान";

  return <div className="mx-auto w-full max-w-5xl space-y-5 pb-5">
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#102d25] px-5 py-6 text-white shadow-xl shadow-emerald-950/10 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-200"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><Leaf className="h-5 w-5" /></span><span className="text-xs font-semibold uppercase tracking-[0.2em]">WLMS · Smart Farm</span></div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100">किसान ड्यासबोर्ड</span>
        </div>
        <p className="text-sm text-emerald-100/75">नमस्कार, {firstName}</p>
        <h1 className="mt-1 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">तपाईंको खेतबारी,<br className="sm:hidden" /> अब अझ सुरक्षित।</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50/75">वन्यजन्तु गतिविधि हेर्नुहोस्, घटना रिपोर्ट गर्नुहोस् र आफ्नो फार्ममा जडान भएका उपकरण व्यवस्थापन गर्नुहोस्।</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-12 rounded-xl bg-emerald-400 px-5 font-semibold text-emerald-950 hover:bg-emerald-300"><Link to="/my-farm/devices"><RadioTower className="mr-2 h-4 w-4" /> उपकरण खोल्नुहोस् <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="h-12 rounded-xl border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"><Link to="/field-capture"><Camera className="mr-2 h-4 w-4" /> घटना रिपोर्ट</Link></Button>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">जडान भएका Controller</span><RadioTower className="h-4 w-4 text-emerald-700" /></div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{loading ? "—" : controllers.length}</div>
        <p className="mt-1 text-xs text-slate-500">तपाईंको फार्ममा</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Online</span><Wifi className="h-4 w-4 text-emerald-600" /></div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">{loading ? "—" : online}</div>
        <p className="mt-1 text-xs text-slate-500">अहिले सम्पर्कमा</p>
      </div>
      <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Offline</span><WifiOff className="h-4 w-4 text-slate-500" /></div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-700">{loading ? "—" : offline}</div>
        <p className="mt-1 text-xs text-slate-500">सम्पर्क नभएका Controller</p>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">तपाईंका उपकरण</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Farm connectivity</h2></div><Link to="/my-farm/devices" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">सबै हेर्नुहोस् <ChevronRight className="h-4 w-4" /></Link></div>
        {error ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
          : loading ? <div className="mt-5 h-20 animate-pulse rounded-xl bg-slate-100" />
          : controllers.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600"><RadioTower className="h-5 w-5" /></span><div><p className="font-semibold text-slate-800">अहिलेसम्म उपकरण जोडिएको छैन</p><p className="mt-1 text-xs leading-5 text-slate-500">प्रशासकले तपाईंको फार्ममा ESP32 Controller दर्ता गरेपछि यहाँ देखिनेछ।</p></div></div></div>
          : <div className="mt-4 space-y-2">{controllers.slice(0, 3).map((item) => <div key={item.controller_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CpuIcon /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.label}</p><p className="truncate text-[11px] text-slate-500">{item.controller_id}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "online" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status === "online" ? "Online" : "Offline"}</span></div>)}</div>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">छिटो पहुँच</p><h2 className="mt-1 text-xl font-semibold text-slate-900">के गर्न चाहनुहुन्छ?</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <QuickLink to="/my-farm/devices" icon={Zap} title="उपकरण" detail="Siren र Light" />
          <QuickLink to="/field-capture" icon={Camera} title="रिपोर्ट" detail="घटना पठाउनुहोस्" />
          <QuickLink to="/map" icon={Map} title="नक्सा" detail="क्षेत्र हेर्नुहोस्" />
          <QuickLink to="/notifications" icon={Bell} title="सूचना" detail="नयाँ जानकारी" />
        </div>
      </div>
    </section>

    <section className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-950">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="font-semibold">सुरक्षित सञ्चालन</p><p className="mt-1 text-xs leading-5 text-blue-900/80">उपकरणको वास्तविक अवस्था Controller बाट प्राप्त जानकारीका आधारमा देखाइन्छ। आदेश पठाउनु मात्र उपकरण चलेको प्रमाण होइन; पुष्टि प्राप्त भएपछि मात्र सफल देखाइनेछ।</p></div>
    </section>
  </div>;
}

function CpuIcon() { return <Activity className="h-5 w-5" />; }

function QuickLink({ to, icon: Icon, title, detail }) {
  return <Link to={to} className="group rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm"><Icon className="h-4 w-4" /></span><span className="mt-3 block text-sm font-semibold text-slate-800">{title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{detail}</span></Link>;
}
