import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, CircleCheck, MapPin, Radio, Settings2, ShieldAlert, WifiOff } from "lucide-react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import CameraSetupWizard from "@/components/cameras/CameraSetupWizard";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function CameraDetail() {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["admin", "technician"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    const [cameraResult, connectionResult, statusResult] = await Promise.allSettled([
      api.entities.Camera.get(id),
      canManage ? api.cameras.getConnection(id) : Promise.resolve(null),
      api.cameras.status(),
    ]);
    setCamera(cameraResult.status === "fulfilled" ? cameraResult.value : null);
    setConnection(connectionResult.status === "fulfilled" ? connectionResult.value : null);
    setStatus(statusResult.status === "fulfilled" ? statusResult.value.find((row) => row.camera_id === id) || null : null);
    setLoading(false);
  }, [id, canManage]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Loading camera details…</p>;
  if (!camera) return <p className="py-20 text-center text-sm text-slate-500">Camera not found. <Link to="/cameras" className="text-emerald-700">Back to cameras</Link></p>;

  const ready = (connection?.configured && connection.state === "configured") || (status?.configured && status.state === "configured");
  const connectionState = connection?.state || status?.state;
  const retryApply = async () => {
    setRetrying(true);
    try {
      await api.cameras.apply(id);
      await load();
    } catch (error) {
      toast({ title: "Could not apply camera route", description: error.message, variant: "destructive" });
    } finally {
      setRetrying(false);
    }
  };
  return <main className="mx-auto max-w-4xl">
    <Link to="/cameras" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> All cameras</Link>
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><Camera className="mt-1 h-6 w-6 text-emerald-700" /><div><h1 className="text-2xl font-semibold text-slate-900">{camera.name}</h1><p className="mt-1 text-sm text-slate-500">{camera.brand || "Camera"} {camera.model || ""} · {camera.camera_id || camera.id}</p></div></div>
      <div className="flex flex-wrap gap-2">{ready && <Button asChild variant="outline"><Link to={`/cameras/${camera.id}/live`}><Radio className="mr-2 h-4 w-4" /> Open live view</Link></Button>}{canManage && connectionState === "apply_failed" && <Button variant="outline" onClick={retryApply} disabled={retrying}>{retrying ? "Retrying…" : "Retry server apply"}</Button>}{canManage && <Button onClick={() => setWizardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Settings2 className="mr-2 h-4 w-4" />{ready ? "Edit camera route" : "Set up camera route"}</Button>}</div>
    </header>

    <section className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-950" : connection?.state === "apply_failed" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-slate-200 bg-white text-slate-700"}`}>
      {ready ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" /> : connectionState === "apply_failed" ? <WifiOff className="mt-0.5 h-5 w-5 shrink-0" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />}
      <div><p className="font-medium">{ready ? "Camera route is configured" : connectionState === "apply_failed" ? "Camera needs attention" : "Camera route is not configured"}</p><p className="mt-1 text-xs opacity-80">{ready ? "Live access is restricted to signed-in users with permission for this research site." : connection?.last_error || "Add its stream route to make this camera available through the server."}</p></div>
    </section>

    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <Detail label="Research site" value={camera.site_name || "Not assigned"} />
      <Detail label="Ward" value={camera.ward ? `Pokhara ${camera.ward}` : "Not recorded"} />
      <Detail label="Connection state" value={ready ? ((connection?.online || status?.online) ? "Live now" : "Configured · waiting for a viewer") : "Setup required"} />
      {connection?.configured && <Detail label="Router / route" value={connection.network_label || "Not named"} />}
      {connection?.configured && <Detail label="Stream type" value={`${connection.protocol.toUpperCase()} · port ${connection.port}`} />}
      {connection?.configured && <Detail label="Camera address" value={`${connection.host}${connection.stream_path}`} />}
      {connection?.configured && <Detail label="Transport" value={connection.rtsp_transport?.toUpperCase() || "TCP"} />}
      {connection?.configured && <Detail label="Last connection test" value={connection.last_test_status === "passed" ? formatDate(connection.last_test_at) : "Not passed"} />}
      <div className="sm:col-span-2"><div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400"><MapPin className="h-3.5 w-3.5" /> Installation location</div><p className="text-sm text-slate-700">{camera.latitude != null && camera.longitude != null ? `${Number(camera.latitude).toFixed(6)}, ${Number(camera.longitude).toFixed(6)}` : "No GPS position recorded"}</p><p className="mt-1 text-xs text-slate-500">{camera.installation_description || "No installation note"}</p></div>
    </section>
    <p className="mt-4 text-xs text-slate-500">Camera credentials are not displayed. Use a read-only camera account and keep camera administration ports private.</p>
    {canManage && <CameraSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} sites={[{ id: camera.site_id, name: camera.site_name, ward: camera.ward }]} camera={camera} onCreated={load} />}
  </main>;
}

function Detail({ label, value }) {
  return <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</div><div className="break-all text-sm font-medium text-slate-700">{value}</div></div>;
}

function formatDate(value) {
  if (!value) return "Passed";
  return new Date(value).toLocaleString();
}
