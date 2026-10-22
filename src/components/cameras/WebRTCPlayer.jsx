import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Video, Volume2, VolumeX } from "lucide-react";

const noIceServers = Object.freeze([]);

/** Receives a short-lived, site-authorized MediaMTX WHEP stream. */
export default function WebRTCPlayer({ whepEndpoint, token, iceServers = noIceServers, audioAvailable = false, onError, onReady }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const resourceRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  onErrorRef.current = onError;
  onReadyRef.current = onReady;
  const [status, setStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let gatherTimer;
    let responseLocation = null;
    setStatus("connecting");
    setErrorMsg("");

    const start = async () => {
      if (!whepEndpoint || !token) throw new Error("A valid camera viewing session is required.");
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      if (audioAvailable) pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = (event) => {
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = event.streams[0];
        setStatus("playing");
        onReadyRef.current?.();
      };
      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus("error");
          setErrorMsg("Stream connection lost. Check that the camera, route, and VPS media service are online.");
          onErrorRef.current?.("WebRTC connection lost");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            clearTimeout(gatherTimer);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        gatherTimer = setTimeout(() => {
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }, 4000);
      });

      const response = await fetch(whepEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", Accept: "application/sdp", Authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
      });
      if (cancelled) return;
      if (!response.ok) throw new Error(`The media service rejected the stream request (${response.status}). Check the camera route and viewing permissions.`);
      const location = response.headers.get("Location");
      if (location) {
        responseLocation = new URL(location, whepEndpoint).toString();
        resourceRef.current = responseLocation;
      }
      const answer = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    };

    start().catch((error) => {
      if (cancelled) return;
      setStatus("error");
      setErrorMsg(error.message || "Failed to start the live camera stream.");
      onErrorRef.current?.(error.message);
    });

    return () => {
      cancelled = true;
      clearTimeout(gatherTimer);
      if (resourceRef.current || responseLocation) {
        fetch(resourceRef.current || responseLocation, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
        resourceRef.current = null;
      }
      if (pcRef.current) {
        try { pcRef.current.close(); } catch {}
        pcRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [whepEndpoint, token, iceServers, audioAvailable]);

  return <div className="relative flex h-full w-full items-center justify-center bg-slate-950">
    <video ref={videoRef} autoPlay playsInline muted={muted || !audioAvailable} className={`h-full w-full object-contain ${status === "playing" ? "" : "hidden"}`} />
    {audioAvailable && status === "playing" && <button type="button" onClick={() => { const nextMuted = !muted; setMuted(nextMuted); if (!nextMuted) videoRef.current?.play().catch(() => {}); }} aria-label={muted ? "Enable camera audio" : "Mute camera audio"} className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-black/85">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{muted ? "Enable audio" : "Mute audio"}</button>}
    {status === "connecting" && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Loader2 className="mb-2 h-8 w-8 animate-spin" /><p className="text-sm">Establishing secure live stream…</p></div>}
    {status === "error" && <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-slate-400"><AlertTriangle className="mb-2 h-8 w-8 text-amber-400" /><p className="mb-1 text-sm font-medium text-slate-300">Live stream unavailable</p><p className="max-w-sm text-xs text-slate-500">{errorMsg}</p></div>}
    {status !== "playing" && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur"><Video className="h-3 w-3 text-slate-400" /><span className="font-mono text-[10px] text-slate-300">no signal</span></div>}
  </div>;
}
