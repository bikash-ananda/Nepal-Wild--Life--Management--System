import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeviceAdmin() {
  return <main className="mx-auto max-w-2xl">
    <Link to="/devices" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" /> Device inventory</Link>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="mb-3 flex items-center gap-3"><Settings className="h-6 w-6 text-amber-800" /><h1 className="text-xl font-semibold text-amber-950">Device administration is deferred</h1></div>
      <p className="text-sm text-amber-950">Protocol settings, firmware management, diagnostics, and remote device configuration are not connected to this app.</p>
      <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-white/60 p-3 text-xs text-amber-950"><ShieldAlert className="h-4 w-4 shrink-0" /><p>For the research pilot, keep only equipment inventory here. Any future actuators require an independent safety review and must never be triggered solely by a model or language model.</p></div>
      <Link to="/devices"><Button className="mt-5">Open inventory</Button></Link>
    </section>
  </main>;
}
