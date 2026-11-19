import React from "react";
import { Mic } from "lucide-react";

export default function PrivateAudio({ fileUri, label = "Voice recording" }) {
  if (!fileUri) return null;
  const value = String(fileUri);
  const match = value.match(/(?:media:\/\/|\/api\/media\/)?([0-9a-f-]{36})/i);
  if (!match) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Mic className="h-4 w-4 text-emerald-700" /> {label}
      </div>
      <audio controls preload="none" src={`/api/media/${match[1]}`} className="w-full" />
    </section>
  );
}
