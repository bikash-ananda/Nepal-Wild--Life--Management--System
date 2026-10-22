import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Radio, RefreshCw } from "lucide-react";
import { api } from "@/api/apiClient";
import WebRTCPlayer from "@/components/cameras/WebRTCPlayer";
import { Button } from "@/components/ui/button";

export default function CameraLive() {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const [cameraRecord, viewSession] = await Promise.all([api.entities.Camera.get(id), api.cameras.viewToken(id)]);
      setCamera(cameraRecord);
      setSession({ ...viewSession, whep_url: new URL(viewSession.whep_url, window.location.origin).toString() });
    } catch (cause) {
      setError(cause.message || "This camera stream is not available to your account.");
      setSession(null);
      if (!camera) api.entities.Camera.get(id).then(setCamera).catch(() => setCamera(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { connect(); }, [id]);

  if (loading && !session) return <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Connecting to camera…</div>;
  if (!camera && error) return <p className="py-20 text-center text-sm text-slate-500">Camera not found or access denied. <Link to="/cameras" className="text-emerald-700">Back to cameras</Link></p>;

  return <main className="mx-auto max-w-6xl">
    <Link to={`/cameras/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Camera details</Link>
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold text-slate-900">{camera?.name || "Live camera"}</h1><p className="mt-1 text-sm text-slate-500">{camera?.site_name || "Research site"} · Access is limited to authorized site users</p></div><div className="flex items-center gap-2">{session && <><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"><Radio className="h-3.5 w-3.5" /> Secure live session</span><Button variant="outline" onClick={connect} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Connecting…" : "Reconnect"}</Button></>}</div></header>
    <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
      {session ? <WebRTCPlayer key={session.token} whepEndpoint={session.whep_url} token={session.token} onError={(message) => setError(message)} /> : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300"><Camera className="h-9 w-9 text-slate-500" /><p className="max-w-lg text-sm">{error || "This camera does not have an active stream route yet."}</p><Button variant="outline" onClick={connect} disabled={loading} className="border-slate-600 bg-transparent text-white hover:bg-slate-800"><RefreshCw className="mr-2 h-4 w-4" />Try connection again</Button></div>}
    </div>
    <p className="mt-3 text-xs text-slate-500">The live view is muted and not recorded by this page. Camera video may include bystanders; follow the site's agreed privacy and retention rules.</p>
  </main>;
}
