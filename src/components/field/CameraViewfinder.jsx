import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, CameraOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobile camera viewfinder using the browser MediaDevices API.
// Captures a frame to a compressed JPEG dataURL and calls onCapture(dataUrl).
// Supports switching between rear (environment) and front (user) cameras.
export default function CameraViewfinder({ onCapture, disabled }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState("environment");
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const start = async (facingMode) => {
    setStarting(true);
    setReady(false);
    setError(null);
    stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported on this device");
      setStarting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch (e) {
      setError(e.message || "Camera access denied");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    start(facing);
    return () => stop();

  }, [facing]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !ready || disabled || capturing) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      setCapturing(true);
      await onCapture?.(dataUrl);
    } catch {
      // The parent reports save errors; keep this control usable for another attempt.
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-video bg-slate-900 rounded-3xl overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          ready ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Framing reticle */}
      {ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-2/3 h-2/3 border-2 border-white/30 rounded-2xl" />
        </div>
        )}

      {/* Top bar: facing toggle + status */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur",
            ready ? "bg-emerald-500/90 text-white" : "bg-white/80 text-slate-700"
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", ready ? "bg-white" : "bg-slate-400 animate-pulse")} />
          {starting ? "Starting" : ready ? "Live" : "Paused"}
        </span>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          disabled={starting}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {facing === "environment" ? "Rear" : "Front"}
        </button>
      </div>

      {/* Capture button */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
        <button
          type="button"
          onClick={capture}
          disabled={!ready || disabled || starting || capturing}
          className={cn(
            "w-18 h-18 rounded-full border-4 border-white/90 flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40",
            "bg-white/15 backdrop-blur"
          )}
          style={{ width: 72, height: 72 }}
          aria-label="Capture photo"
        >
          <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
            {capturing ? <Loader2 className="w-6 h-6 animate-spin text-slate-800" /> : <Camera className="w-6 h-6 text-slate-800" />}
          </span>
        </button>
      </div>

      {/* Loading / error overlays */}
      {(starting || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-slate-900/80">
          {error ? (
            <>
              <CameraOff className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-sm text-white font-medium mb-1">Camera unavailable</p>
              <p className="text-xs text-slate-300 max-w-xs">{error}</p>
              <button
                onClick={() => start(facing)}
                className="mt-4 text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 text-white backdrop-blur"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 text-white/80 animate-spin mb-2" />
              <p className="text-xs text-slate-300">Starting camera…</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
