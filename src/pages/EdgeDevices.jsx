import React, { useEffect, useState } from "react";
import { Cpu, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function EdgeDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api.entities.EdgeDevice.list().then(setDevices).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <div>
    <PageHeader title="Edge Gateway Inventory" description="Track proposed field gateways without claiming that a gateway is online." icon={Cpu} />
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>No gateway agent, camera ingestion, telemetry, restart, or firmware service is connected. CCTV transport is deferred.</p></div>
    {error && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading gateway inventory…</p> : devices.length ? <div className="space-y-3">{devices.map((device) => <article key={device.id} className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-medium text-slate-800">{device.name || "Unnamed gateway"}</h2><p className="mt-1 text-xs text-slate-500">{device.site_name || "No site"} · {device.device_id || device.id}</p><p className="mt-2 text-xs text-amber-800">Inventory record only; no heartbeat or telemetry has been verified.</p></article>)}</div> : <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={Cpu} title="No field gateway registered" description="Gateway setup belongs to a later, separately secured phase." /></div>}
  </div>;
}
