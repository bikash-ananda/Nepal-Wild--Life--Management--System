import React, { useEffect, useState } from "react";
import { Cpu, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function DeviceDashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.entities.Device.list().then(setDevices).catch(() => setDevices([])).finally(() => setLoading(false)); }, []);
  const counts = devices.reduce((all, device) => { const key = device.category || "other"; all[key] = (all[key] || 0) + 1; return all; }, {});
  return <div>
    <PageHeader title="Equipment Overview" description="Current application records for equipment assigned to sites." icon={Cpu} />
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>This page has no live telemetry. It reports saved inventory records only; online state, health, battery, and temperature are unknown until a gateway sends signed measurements.</p></div>
    {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading inventory…</p> : devices.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Inventory records" value={devices.length} />{Object.entries(counts).map(([category, count]) => <Metric key={category} label={category} value={count} />)}<Metric label="Connected" value="Not measured" /></div> : <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={Cpu} title="No equipment inventory" description="Add site equipment from the inventory page." /></div>}
  </div>;
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div></div>;
}
