import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Play, Pause, AlertCircle } from "lucide-react";

const MAX_RECORDING_MS = 90000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function supportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"]
    .find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

export default function VoiceRecorder({ value, onChange, disabled = false, language = "en" }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [consent, setConsent] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  const np = language === "np";
  useEffect(() => {
    if (!value) { setAudioUrl(""); return undefined; }
    const url = URL.createObjectURL(value);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = async () => {
    setError("");
    if (!consent) {
      setError(np ? "रेकर्डिङ पठाउन अनुमति दिनुहोस्।" : "Please agree to attach the recording to this report.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(np ? "यो ब्राउजरमा अडियो रेकर्डिङ उपलब्ध छैन।" : "Audio recording is not supported by this browser.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mimeType = supportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => setError(np ? "रेकर्डिङमा समस्या आयो।" : "Recording failed. Please try again.");
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > MAX_AUDIO_BYTES) {
          setError(np ? "रेकर्डिङ ८ MB भन्दा ठूलो भयो। छोटो रेकर्डिङ गर्नुहोस्।" : "Recording is larger than 8 MB. Please make a shorter recording.");
        } else if (blob.size) {
          onChange(blob);
        }
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setElapsed(0);
      setRecording(true);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(seconds);
        if (seconds * 1000 >= MAX_RECORDING_MS && recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 500);
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      setError(cause?.name === "NotAllowedError"
        ? (np ? "माइक्रोफोन अनुमति दिनुहोस्।" : "Microphone permission was denied.")
        : (np ? "माइक्रोफोन सुरु गर्न सकिएन।" : "Could not start the microphone."));
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const remove = () => {
    if (recording) stop();
    onChange(null);
    setPlaying(false);
    setError("");
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3" aria-label={np ? "वैकल्पिक आवाज रेकर्डिङ" : "Optional voice recording"}>
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{np ? "आवाज रेकर्ड गर्नुहोस् (वैकल्पिक)" : "Voice recording (optional)"}</p>
          <p className="text-xs text-slate-500">{np ? "घटनाबारे छोटकरीमा बोल्नुहोस्। अधिकतम ९० सेकेन्ड।" : "Briefly describe what happened. Up to 90 seconds."}</p>
        </div>
        <span className={recording ? "text-xs font-semibold text-rose-600" : "text-xs text-slate-400"}>{recording ? "● REC" : value ? (np ? "रेकर्ड भयो" : "Recorded") : ""}</span>
      </div>
      {!value && !recording && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={disabled} className="mt-0.5 rounded border-slate-300" />
          <span>{np ? "मेरो आवाज यो रिपोर्टसँगै सुरक्षित गरी अधिकृत समीक्षकलाई पठाउन सहमत छु।" : "I agree to save this voice recording with the report and share it with authorized reviewers."}</span>
        </label>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!value && !recording && (
          <button type="button" onClick={start} disabled={disabled} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            <Mic className="h-4 w-4" /> {np ? "रेकर्ड सुरु" : "Start recording"}
          </button>
        )}
        {recording && (
          <button type="button" onClick={stop} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            <Square className="h-4 w-4" /> {np ? "रेकर्ड रोक्नुहोस्" : "Stop recording"} · {elapsed}s
          </button>
        )}
        {value && audioUrl && (
          <>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
            <button type="button" onClick={async () => {
              if (!audioRef.current) return;
              if (playing) { audioRef.current.pause(); setPlaying(false); }
              else { try { await audioRef.current.play(); setPlaying(true); } catch { setError(np ? "अडियो चलाउन सकिएन।" : "Could not play the recording."); } }
            }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? (np ? "रोक्नुहोस्" : "Pause") : (np ? "सुन्नुहोस्" : "Play")}
            </button>
            <button type="button" onClick={remove} disabled={disabled} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
              <Trash2 className="h-4 w-4" /> {np ? "हटाउनुहोस्" : "Remove"}
            </button>
            <span className="text-xs text-slate-500">{(value.size / 1024).toFixed(0)} KB</span>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
    </section>
  );
}
