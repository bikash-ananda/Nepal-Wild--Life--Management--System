import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Target, Eye, Fingerprint, ImageOff, Clock, Route } from "lucide-react";
import PrivateImage from "@/components/PrivateImage";

const KIND_META = {
  detection: { icon: Target, tone: "text-blue-600 bg-blue-50 border-blue-100", label: "Camera detection" },
  observation: { icon: Eye, tone: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "Field observation" },
};

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export default function SightingTimeline({ sightings, individual }) {
  if (!sightings.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <Fingerprint className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">
          No re-sightings recorded yet. Linked detections and observations will appear here as a timeline.
        </p>
      </div>
    );
  }

  // Group consecutive sightings on the same day into clusters
  const clusters = [];
  sightings.forEach((s) => {
    const last = clusters[clusters.length - 1];
    if (last && sameDay(last.date, s._date)) {
      last.items.push(s);
    } else {
      clusters.push({ date: s._date, items: [s] });
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-800">
          Re-sighting timeline
          {individual && <span className="text-slate-400 font-normal"> · {individual.nickname || individual.individual_code}</span>}
        </h3>
        <span className="text-xs text-slate-400">{sightings.length} {sightings.length === 1 ? "entry" : "entries"}</span>
      </div>

      <div className="relative pl-6">
        {/* vertical line */}
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-6">
          {clusters.map((cluster, ci) => {
            const isLatest = ci === 0;
            return (
              <div key={ci} className="relative">
                {/* node */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white shadow ${
                    isLatest ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"
                  }`}
                />

                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">
                    {new Date(cluster.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {isLatest && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Latest</span>
                  )}
                  {cluster.items.length > 1 && (
                    <span className="text-[10px] text-slate-400">{cluster.items.length} sightings</span>
                  )}
                </div>

                <div className="space-y-2">
                  {cluster.items.map((s) => {
                    const meta = KIND_META[s._kind] || KIND_META.observation;
                    const Icon = meta.icon;
                    return (
                      <div key={s.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {s._photo ? (
                            <PrivateImage fileUri={s._photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageOff className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.tone}`}>
                              <Icon className="w-3 h-3" /> {meta.label}
                            </span>
                            {typeof s.match_confidence === "number" && (
                              <span className="text-[11px] text-slate-500">{Math.round(s.match_confidence * 100)}% match</span>
                            )}
                            {individual == null && s._individual && (
                              <Link
                                to={`/individuals/${s._individual.id}`}
                                className="text-[11px] text-emerald-700 hover:underline truncate"
                              >
                                {s._individual.nickname || s._individual.individual_code}
                              </Link>
                            )}
                          </div>
                          {s._location && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" /> {s._location}
                            </div>
                          )}
                          {s._time && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" /> {s._time}
                            </div>
                          )}
                          {s._coords && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Route className="w-3 h-3" /> {s._coords}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}