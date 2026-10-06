import React from "react";
import { MapPin, Clock, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Fingerprint, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: { label: "Queued", tone: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  processing: { label: "Processing", tone: "bg-sky-100 text-sky-700", dot: "bg-sky-500 animate-pulse" },
  processed: { label: "Classified", tone: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  failed: { label: "Failed", tone: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
};

function confidenceTone(v) {
  return v >= 0.75 ? "text-emerald-600" : v >= 0.5 ? "text-amber-600" : "text-slate-500";
}

export default function CaptureResultCard({ item, onRetry, onRemove }) {
  const status = STATUS[item.status] || STATUS.pending;
  const r = item.result;
  const cls = r?.classification;
  const match = r?.individual_match;
  const autoLinked = match?.auto_linked;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
          {item.photoDataUrl ? (
            <img src={item.photoDataUrl} alt="capture" className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full", status.tone)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>
            <div className="flex items-center gap-1">
              {item.status === "failed" && (
                <button onClick={() => onRetry?.()} className="p-1 text-slate-400 hover:text-emerald-600" title="Retry">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => onRemove?.()} className="p-1 text-slate-400 hover:text-rose-600" title="Remove">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {item.status === "processing" || item.status === "pending" ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
              {item.status === "processing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{item.status === "pending" ? "Waiting for connection to sync…" : "Classifying animal…"}</span>
            </div>
          ) : item.status === "failed" ? (
            <p className="mt-2 text-xs text-rose-600 line-clamp-2">{item.error || "Processing failed"}</p>
          ) : (
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm truncate">
                  {cls?.species_name || "Unknown"}
                </span>
                {typeof cls?.confidence === "number" && (
                  <span className={cn("text-xs font-bold", confidenceTone(cls.confidence))}>
                    {Math.round(cls.confidence * 100)}%
                  </span>
                )}
              </div>
              {cls?.behavior && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cls.behavior}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                {item.latitude != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.captured_at || item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {(r?.flagship || autoLinked) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r?.flagship && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                      <Bell className="w-2.5 h-2.5" /> Flagship alert sent
                    </span>
                  )}
                  {autoLinked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Fingerprint className="w-2.5 h-2.5" /> Matched: {autoLinked.nickname}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}