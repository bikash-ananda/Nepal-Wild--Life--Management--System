import React, { useEffect, useRef, useState } from "react";
import { Loader2, WifiOff, AlertTriangle, Video } from "lucide-react";

/**
 * WebRTC player using WHEP (WebRTC-HTTP Egress Protocol) for MediaMTX-compatible gateways.
 * Flow: RTCPeerConnection (recvonly) -> POST SDP offer to whep_endpoint -> set remote answer.
 */
export default function WebRTCPlayer({ whepEndpoint, iceServers, onError, onReady }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState("connecting"); // connecting | playing | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("connecting");
    setErrorMsg("");

    if (!whepEndpoint) {
      setStatus("error");
      setErrorMsg("No WebRTC endpoint configured. Connect a media gateway to enable live video.");
      onError && onError("No WebRTC endpoint configured");
      return;
    }

    const start = async () => {
      try {
        const pc = new RTCPeerConnection({ iceServers: iceServers || [{ urls: "stun:stun.l.google.com:19302" }] });
        pcRef.current = pc;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.ontrack = (e) => {
          if (cancelled) return;
          if (videoRef.current) videoRef.current.srcObject = e.streams[0];
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setStatus("error");
            setErrorMsg("Stream connection lost. The camera or gateway may be offline.");
            onError && onError("connection lost");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await new Promise((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } };
          pc.addEventListener("icegatheringstatechange", check);
          setTimeout(resolve, 3000); // don't block forever
        });

        const resp = await fetch(whepEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription.sdp,
        });

        if (cancelled) return;

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`Gateway rejected WebRTC offer (HTTP ${resp.status}). ${text.slice(0, 120)}`);
        }

        const answerSdp = await resp.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        setStatus("playing");
        onReady && onReady();
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(e.message || "Failed to establish WebRTC stream.");
        onError && onError(e.message);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (pcRef.current) {
        try { pcRef.current.close(); } catch {}
        pcRef.current = null;
      }
    };
  }, [whepEndpoint]);

  return (
    <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain ${status === "playing" ? "" : "hidden"}`}
      />
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-sm">Establishing WebRTC stream…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 px-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-sm font-medium text-slate-300 mb-1">Live stream unavailable</p>
          <p className="text-xs text-slate-500 max-w-sm">{errorMsg}</p>
        </div>
      )}
      {status !== "playing" && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur px-2 py-1 rounded-md">
          <Video className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-300 font-mono">no signal</span>
        </div>
      )}
    </div>
  );
}