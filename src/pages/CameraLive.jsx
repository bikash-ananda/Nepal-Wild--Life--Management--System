import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Camera, Loader2, Radio, RefreshCw, ShieldAlert, Lightbulb, Home } from "lucide-react";
import { api } from "@/api/apiClient";
import WebRTCPlayer from "@/components/cameras/WebRTCPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

const ptzDirections = [
  { direction: "LeftUp", Icon: ArrowUpLeft, label: "Move camera up and left", position: "col-start-1 row-start-1" },
  { direction: "Up", Icon: ArrowUp, label: "Move camera up", position: "col-start-2 row-start-1" },
  { direction: "RightUp", Icon: ArrowUpRight, label: "Move camera up and right", position: "col-start-3 row-start-1" },
  { direction: "Left", Icon: ArrowLeft, label: "Move camera left", position: "col-start-1 row-start-2" },
  { direction: "Right", Icon: ArrowRight, label: "Move camera right", position: "col-start-3 row-start-2" },
  { direction: "LeftDown", Icon: ArrowDownLeft, label: "Move camera down and left", position: "col-start-1 row-start-3" },
  { direction: "Down", Icon: ArrowDown, label: "Move camera down", position: "col-start-2 row-start-3" },
  { direction: "RightDown", Icon: ArrowDownRight, label: "Move camera down and right", position: "col-start-3 row-start-3" },
];

export default function CameraLive() {
  const { id } = useParams();
  const { user } = useAuth();
  const canControl = ["admin", "technician"].includes(user?.role);
  const [camera, setCamera] = useState(null);
  const [connection, setConnection] = useState(null);
  const [session, setSession] = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [controlMessage, setControlMessage] = useState("");
  const [controlBusy, setControlBusy] = useState(false);
  const [moving, setMoving] = useState("");
  const [events, setEvents] = useState([]);
  const [eventFeedStatus, setEventFeedStatus] = useState("connecting");
  const [eventFeedError, setEventFeedError] = useState("");
  const [deterrenceBusy, setDeterrenceBusy] = useState("");
  const [sirenOn, setSirenOn] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [presetId, setPresetId] = useState("1");
  const activeDirection = useRef("");

  const stopPtz = useCallback(async (direction = activeDirection.current) => {
    if (!direction) return;
    activeDirection.current = "";
    setMoving("");
    try {
      await api.cameras.ptz(id, { action: "stop", direction, speed: 3 });
      setControlMessage("Camera movement stopped.");
    } catch (cause) {
      setControlMessage(cause.message || "Could not send the camera stop command.");
    }
  }, [id]);

  const startPtz = async (direction) => {
    if (activeDirection.current || controlBusy) return;
    activeDirection.current = direction;
    setMoving(direction);
    setControlBusy(true);
    setControlMessage("");
    try {
      await api.cameras.ptz(id, { action: "start", direction, speed: 3 });
      setControlMessage("Moving briefly. Release the control to stop.");
    } catch (cause) {
      activeDirection.current = "";
      setMoving("");
      setControlMessage(cause.message || "The camera did not accept the movement command.");
    } finally {
      setControlBusy(false);
    }
  };

  const goToPreset = async () => {
    const preset = Number(presetId);
    if (!Number.isInteger(preset) || preset < 1 || preset > 255 || controlBusy) {
      setControlMessage("Choose a saved preset number from 1 to 255.");
      return;
    }
    setControlBusy(true);
    setControlMessage("");
    try {
      await api.cameras.ptz(id, { action: "preset", preset_id: preset });
      setControlMessage(`Sent the command to recall preset ${preset}. The preset must already be saved on the camera.`);
    } catch (cause) {
      setControlMessage(cause.message || "The camera did not accept the preset command.");
    } finally {
      setControlBusy(false);
    }
  };

  const setDeterrence = async (device, state) => {
    setDeterrenceBusy(`${device}:${state}`);
    try {
      const result = await api.cameras.deterrence(id, { device, state });
      if (device === "siren") {
        setSirenOn(state === "on");
        if (state === "on") window.setTimeout(() => setSirenOn(false), (result.auto_off_seconds || 10) * 1000);
      } else setLightOn(state === "manual");
      setControlMessage(device === "siren" && state === "on" ? "Siren activated manually; the server will send an automatic off command after 10 seconds." : `${device === "light" ? "Light" : "Siren"} command sent.`);
    } catch (cause) {
      setControlMessage(cause.message || "The camera did not accept the manual command.");
      toast({ title: "Camera command failed", description: cause.message || "Check the private camera route and firmware support.", variant: "destructive" });
    } finally {
      setDeterrenceBusy("");
    }
  };

  const connect = useCallback(async () => {
    setLoading(true);
    setError("");
    setStreamReady(false);
    try {
      const [cameraRecord, viewSession] = await Promise.all([api.entities.Camera.get(id), api.cameras.viewToken(id)]);
      setCamera(cameraRecord);
      setSession({ ...viewSession, whep_url: new URL(viewSession.whep_url, window.location.origin).toString() });
      setConnection({ audio_enabled: viewSession.audio_enabled === true });
      api.cameras.events(id, 30).then(setEvents).catch(() => setEvents([]));
      api.cameras.eventStatus(id).then((status) => {
        setEventFeedStatus(status.status || "unknown");
        setEventFeedError(status.last_error || "");
      }).catch(() => {});
      if (canControl) {
        const savedConnection = await api.cameras.getConnection(id).catch(() => null);
        setConnection(savedConnection);
      }
    } catch (cause) {
      setError(cause.message || "This camera stream is not available to your account.");
      setSession(null);
      api.entities.Camera.get(id).then(setCamera).catch(() => setCamera(null));
    } finally {
      setLoading(false);
    }
  }, [id, canControl]);

  useEffect(() => { connect(); }, [connect]);

  useEffect(() => {
    if (!id) return undefined;
    const feedUrl = new URL(api.cameras.eventFeedUrl(id), window.location.origin);
    feedUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let disposed = false;
    let retryTimer;
    let retryDelay = 1000;
    let activeSocket;
    const connect = () => {
      if (disposed) return;
      const stream = new WebSocket(feedUrl);
      activeSocket = stream;
      stream.onopen = () => {
        retryDelay = 1000;
        setEventFeedStatus((current) => current === "not_configured" ? current : "connected");
      };
      stream.onerror = () => setEventFeedStatus((current) => current === "not_configured" ? current : "reconnecting");
      stream.onclose = (event) => {
        if (disposed) return;
        if (event.code === 1008) {
          setEventFeedStatus("session_expired");
          return;
        }
        setEventFeedStatus((current) => current === "not_configured" ? current : "reconnecting");
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
      stream.onmessage = (message) => {
        try {
          const messageData = JSON.parse(message.data || "{}");
          const payload = messageData.data || {};
          if (messageData.type === "ready") {
            if (payload.status) setEventFeedStatus(payload.status);
          } else if (messageData.type === "camera-event") {
            setEvents((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 30));
            setEventFeedStatus("streaming");
            toast({ title: "Camera event received", description: `${payload.camera_name || "Camera"} · ${formatEventType(payload.event_code)}` });
          } else if (messageData.type === "camera-status") {
            setEventFeedStatus(payload.status || "unknown");
            setEventFeedError(payload.last_error || "");
          }
        } catch { /* Ignore malformed or unsupported feed messages. */ }
      };
    };
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      activeSocket?.close(1000, "Camera page closed");
    };
  }, [id]);

  useEffect(() => {
    const stopOnBlur = () => { void stopPtz(); };
    const stopWhenHidden = () => { if (document.hidden) void stopPtz(); };
    window.addEventListener("blur", stopOnBlur);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("blur", stopOnBlur);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      void stopPtz();
    };
  }, [stopPtz]);

  if (loading && !session) return <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Connecting to camera…</div>;
  if (!camera && error) return <p className="py-20 text-center text-sm text-slate-500">Camera not found or access denied. <Link to="/cameras" className="text-emerald-700">Back to cameras</Link></p>;

  const ptzEnabled = canControl && connection?.ptz_enabled && connection?.network_mode === "vpn_routed";

  return <main className="mx-auto max-w-6xl">
    <Link to={`/cameras/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Camera details</Link>
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold text-slate-900">{camera?.name || "Live camera"}</h1><p className="mt-1 text-sm text-slate-500">{camera?.site_name || "Research site"} · Access is limited to authorized site users</p></div><div className="flex items-center gap-2">{session && <><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${streamReady ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}><Radio className="h-3.5 w-3.5" />{streamReady ? "Live video" : "Connecting to video"}</span><Button variant="outline" onClick={connect} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Connecting…" : "Reconnect"}</Button></>}</div></header>
    {error && session && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span>{error}</span><Button variant="outline" size="sm" onClick={connect} disabled={loading}>Reconnect stream</Button></div>}
    <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
      {session ? <WebRTCPlayer key={session.token} whepEndpoint={session.whep_url} token={session.token} audioAvailable={connection?.audio_enabled === true} onReady={() => { setStreamReady(true); setError(""); }} onError={(message) => { setStreamReady(false); setError(message); }} /> : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300"><Camera className="h-9 w-9 text-slate-500" /><p className="max-w-lg text-sm">{error || "This camera does not have an active stream route yet."}</p><Button variant="outline" onClick={connect} disabled={loading} className="border-slate-600 bg-transparent text-white hover:bg-slate-800"><RefreshCw className="mr-2 h-4 w-4" />Try connection again</Button></div>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Live video is not recorded here. If audio is enabled for this camera, it starts muted until you choose Enable audio. Event snapshots are private and removed automatically after the configured retention period.</p>

    <section aria-label="Camera events and snapshots" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">Live events & snapshots</h2><p className="mt-1 text-sm text-slate-500">Camera events are signals for human review; built-in human detection does not mean monkey identification.</p></div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${eventFeedStatus === "streaming" || eventFeedStatus === "connected" ? "bg-emerald-50 text-emerald-800" : eventFeedStatus === "reconnecting" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}><Radio className="h-3.5 w-3.5" />{humanizeStatus(eventFeedStatus)}</span>
      </div>
      {eventFeedError && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{eventFeedError}</p>}
      {events.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map((event) => <article key={event.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {event.photo_url ? <a href={event.photo_url} target="_blank" rel="noreferrer" className="block bg-slate-900"><img src={event.photo_url} alt={`Camera snapshot: ${formatEventType(event.event_code)}`} loading="lazy" className="h-40 w-full object-contain" /></a> : <div className="flex h-28 items-center justify-center bg-slate-100 text-xs text-slate-500">{event.snapshot_error ? "Snapshot unavailable" : "No snapshot attached"}</div>}
        <div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-slate-900">{formatEventType(event.event_code)}</p><p className="mt-0.5 text-xs text-slate-500">{event.camera_name || camera?.name}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900">Human review</span></div><p className="text-xs text-slate-500">{event.detected_at ? new Date(event.detected_at).toLocaleString() : "Time unavailable"}</p>{event.photo_url && <a href={event.photo_url} download className="inline-flex text-xs font-medium text-emerald-800 hover:underline">Download private snapshot</a>}</div>
      </article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center"><p className="text-sm font-medium text-slate-700">No camera events yet</p><p className="mt-1 text-xs text-slate-500">Enable the event listener in camera setup and connect through the configured private VPN route.</p>{canControl && <Button asChild variant="outline" size="sm" className="mt-3"><Link to={`/cameras/${id}`}>Camera setup</Link></Button>}</div>}
    </section>

    {canControl && <section aria-label="Manual camera controls" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">Camera direction</h2><p className="mt-1 text-sm text-slate-500">Manual pan and tilt controls for authorized technicians.</p></div>
        {ptzEnabled && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><Radio className="h-3.5 w-3.5" />Private VPN control</span>}
      </div>
      {ptzEnabled ? <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="grid h-36 w-36 grid-cols-3 grid-rows-3 gap-2" onPointerLeave={() => { if (activeDirection.current) void stopPtz(); }}>
          {ptzDirections.map(({ direction, Icon, label, position }) => <Button key={direction} type="button" aria-label={label} aria-pressed={moving === direction} title={`${label} · hold briefly`} disabled={controlBusy && moving !== direction} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); void startPtz(direction); }} onPointerUp={() => { if (activeDirection.current === direction) void stopPtz(direction); }} onPointerCancel={() => { if (activeDirection.current === direction) void stopPtz(direction); }} onLostPointerCapture={() => { if (activeDirection.current === direction) void stopPtz(direction); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); void startPtz(direction); } }} onKeyUp={(event) => { if (event.key === "Enter" || event.key === " ") void stopPtz(direction); }} onBlur={() => { if (activeDirection.current === direction) void stopPtz(direction); }} className={`h-full w-full touch-none select-none ${position} ${moving === direction ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}><Icon className="h-5 w-5" /></Button>)}
          <Button type="button" aria-label={`Recall saved camera preset ${presetId}`} title={`Go to saved preset ${presetId}`} disabled={controlBusy} onClick={() => void goToPreset()} className="col-start-2 row-start-2 h-full w-full bg-slate-800 hover:bg-slate-700"><Home className="h-4 w-4" /></Button>
        </div>
        <div className="max-w-lg rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>Hold a direction for movement; the server stops it after 0.85 seconds if the release request is lost. Save the preset on the camera first, then set its number here. The lens is fixed-focus, so optical zoom is unavailable.</p></div><label className="mt-3 block max-w-40 text-xs font-medium text-slate-700">Home preset number<Input aria-label="Home preset number" inputMode="numeric" min="1" max="255" value={presetId} onChange={(event) => setPresetId(event.target.value)} className="mt-1 bg-white" /></label>{controlMessage && <p role="status" className="mt-3 text-xs text-slate-700">{controlMessage}</p>}</div>
      </div> : <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>{connection?.ptz_enabled ? "Manual controls require the server to reach this camera over its private VPN route." : "Manual controls are not enabled for this camera. Enable Dahua pan/tilt in camera setup and use a private VPN route."}</p><Button asChild variant="outline" size="sm"><Link to={`/cameras/${id}`}>Camera setup</Link></Button></div>}
      {(connection?.siren_control_enabled || connection?.light_control_enabled) && <div className="mt-5 border-t border-slate-200 pt-4"><div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><h3 className="font-medium text-slate-900">Manual deterrence controls</h3><p className="mt-1 text-xs text-slate-500">Only a direct admin/technician click can send these commands. Camera AI events never activate them. Consider the research protocol and people/animals nearby before use.</p></div></div><div className="mt-3 flex flex-wrap gap-2">{connection.siren_control_enabled && <Button type="button" disabled={Boolean(deterrenceBusy)} onClick={() => void setDeterrence("siren", sirenOn ? "off" : "on")} className={sirenOn ? "bg-rose-800 hover:bg-rose-900" : "bg-rose-600 hover:bg-rose-700"}>{deterrenceBusy?.startsWith("siren:") ? "Sending…" : sirenOn ? "Turn siren off" : "Activate siren · 10 sec"}</Button>}{connection.light_control_enabled && <Button type="button" variant="outline" disabled={Boolean(deterrenceBusy)} onClick={() => void setDeterrence("light", lightOn ? "off" : "manual")}><Lightbulb className="mr-2 h-4 w-4" />{deterrenceBusy?.startsWith("light:") ? "Sending…" : lightOn ? "Turn light off" : "Turn light on"}</Button>}</div></div>}
    </section>}
  </main>;
}

function formatEventType(code) {
  return ({ SmartMotionHuman: "Camera person alert", SmartMotionVehicle: "Camera vehicle alert", VideoMotion: "Camera motion" })[code] || "Camera event";
}

function humanizeStatus(status) {
  return ({ streaming: "Camera event stream", connected: "Browser connected", connecting: "Connecting", reconnecting: "Reconnecting", not_configured: "Not configured", stopped: "Stopped", unknown: "Checking status" })[status] || String(status || "Unknown").replaceAll("_", " ");
}
