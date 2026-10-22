import React, { useEffect, useMemo, useState } from "react";
import { Camera, Plus, Search } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CameraCard from "@/components/cameras/CameraCard";
import CameraSetupWizard from "@/components/cameras/CameraSetupWizard";
import { useAuth } from "@/lib/AuthContext";

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { user } = useAuth();
  const canManage = ["admin", "technician"].includes(user?.role);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.entities.Camera.list("-created_date", 200),
      api.entities.Site.list(),
      api.cameras.status().catch(() => []),
    ]).then(([cameraRows, siteRows, cameraStatuses]) => {
      setCameras(cameraRows);
      setSites(siteRows);
      setStatuses(cameraStatuses);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cameras;
    return cameras.filter((camera) => `${camera.name || ""} ${camera.camera_id || ""} ${camera.site_name || ""} ${camera.brand || ""} ${camera.model || ""}`.toLowerCase().includes(query));
  }, [cameras, search]);

  const liveCount = statuses.filter((item) => item.online).length;
  const configuredCount = statuses.filter((item) => item.configured && item.state === "configured").length;

  return <div>
    <PageHeader title="Farm cameras" description="Connect each camera through its own router or VPN route, test it from the VPS, and manage access by research site." icon={Camera}
      actions={canManage && <Button onClick={() => setWizardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" /> Add camera</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Summary label="Registered cameras" value={cameras.length} />
      <Summary label="Configured streams" value={configuredCount} />
      <Summary label="Live now" value={liveCount} />
    </div>
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><strong className="text-slate-800">A separate profile for every camera.</strong> Enter the router/DDNS address, mapped stream port, protocol, and stream path for that camera. Credentials are encrypted on the server. Cameras can be on different farms and routers.</div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search camera, model, or site" /></div>
      <div className="text-sm text-slate-500">{cameras.length} camera{cameras.length === 1 ? "" : "s"} · {configuredCount} configured</div>
    </div>
    {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading camera list…</p> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((camera) => <CameraCard key={camera.id} cam={camera} sites={sites} status={statuses.find((item) => item.camera_id === camera.id)} />)}</div> : <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={Camera} title={search ? "No matching cameras" : "No cameras yet"} description={canManage ? "Add the first farm camera to begin its connection setup." : "No cameras have been registered for your research sites yet."} action={canManage && <Button onClick={() => setWizardOpen(true)}>Add camera</Button>} /></div>}
    {canManage && <CameraSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} sites={sites} onCreated={load} />}
  </div>;
}

function Summary({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>;
}
