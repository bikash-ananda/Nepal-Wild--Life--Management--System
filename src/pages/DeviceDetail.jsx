import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Cpu, MapPin, ShieldAlert } from "lucide-react";
import { api } from "@/api/apiClient";
import DeviceTypeIcon from "@/components/devices/DeviceTypeIcon";

export default function DeviceDetail() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.entities.Device.get(id).then(setDevice).catch(() => setDevice(null)).finally(() => setLoading(false)); }, [id]);

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Loading inventory…</p>;
  if (!device) return <p className="py-20 text-center text-sm text-slate-500">Device record not found. <Link to="/devices" className="text-emerald-700">Back to inventory</Link></p>;
  return <main className="mx-auto max-w-4xl">
    <Link to="/devices" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" /> Device inventory</Link>
    <header className="mb-5 flex items-start gap-3"><DeviceTypeIcon type={device.device_type} category={device.category} /><div><h1 className="text-2xl font-semibold text-slate-900">{device.name}</h1><p className="mt-1 text-sm text-slate-500">{device.device_type} · {device.manufacturer || "Unknown manufacturer"} {device.model || ""}</p></div></header>
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>This is an inventory record. Device connectivity, telemetry, remote updates, and all physical controls remain unavailable.</p></div>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <Detail label="Inventory ID" value={device.device_uuid || device.id} />
      <Detail label="Inventory state" value="Not connected" />
      <Detail label="Serial number" value={device.serial_number || "Not recorded"} />
      <Detail label="Site" value={device.site_name || "Not assigned"} />
      <div className="sm:col-span-2"><div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400"><MapPin className="h-3.5 w-3.5" /> Location</div><p className="text-sm text-slate-700">{device.latitude != null && device.longitude != null ? `${Number(device.latitude).toFixed(6)}, ${Number(device.longitude).toFixed(6)}` : "No GPS position recorded"}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{device.notes || "No notes"}</p></div>
    </section>
  </main>;
}

function Detail({ label, value }) {
  return <div><div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400"><Cpu className="h-3.5 w-3.5" />{label}</div><p className="text-sm font-medium text-slate-700">{value}</p></div>;
}
