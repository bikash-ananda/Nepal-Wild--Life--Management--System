import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

function recognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceTranscriptionInput({ value, onChange }) {
  const { lang, t } = useLanguage();
  const [listening, setListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState(lang);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");

  useEffect(() => () => recognitionRef.current?.abort(), []);
  useEffect(() => setVoiceLanguage(lang), [lang]);

  const start = () => {
    const SpeechRecognition = recognitionConstructor();
    if (!SpeechRecognition) {
      setError(t("voice.unsupported"));
      return;
    }

    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage === "ne" ? "ne-NP" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    baseTextRef.current = value.trim();
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) onChange([baseTextRef.current, transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? t("voice.permissionError") : t("voice.failed"));
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError(t("voice.failed"));
      setListening(false);
    }
  };

  const stop = () => recognitionRef.current?.stop();

  return (
    <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
      <label className="flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-600">
        <span>भाषा / Language</span>
        <select
          value={voiceLanguage}
          onChange={(event) => setVoiceLanguage(event.target.value)}
          disabled={listening}
          className="min-h-10 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
          aria-label="Voice input language"
        >
          <option value="ne">नेपाली / Nepali</option>
          <option value="en">English</option>
        </select>
      </label>
      <Button type="button" variant="outline" onClick={listening ? stop : start} className="min-h-11 w-full justify-center sm:w-auto" aria-live="polite">
        {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
        {listening ? t("voice.stop") : t("voice.start")}
      </Button>
      {listening && <p className="text-xs text-slate-500" role="status">{t("voice.listening")}</p>}
      {error && <p className="text-xs text-amber-700" role="status">{error}</p>}
    </div>
  );
}
