import React from "react";
import { Brain, Radar, Camera, Clock, Lightbulb, Target, TrendingUp, Cloud } from "lucide-react";

export default function ExplainableAIPanel({ sample }) {
  if (!sample) return null;
  const confidenceValue = Number(sample.ai_confidence);
  const conf = sample.ai_confidence !== null && sample.ai_confidence !== undefined && Number.isFinite(confidenceValue)
    ? Math.round(confidenceValue * 100)
    : null;
  const aiPredictions = Array.isArray(sample.ai_predictions)
    ? sample.ai_predictions
    : Array.isArray(sample.model_detections) ? sample.model_detections : [];
  const sensors = Array.isArray(sample.sensor_readings)
    ? sample.sensor_readings
    : sample.sensor_readings && typeof sample.sensor_readings === "object"
      ? Object.entries(sample.sensor_readings).map(([type, value]) => ({ type, value }))
      : [];
  const timeline = Array.isArray(sample.decision_timeline) ? sample.decision_timeline : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Brain className="w-4 h-4 text-purple-500" /> Recorded AI Evidence · Human Review Required
      </div>

      {/* AI Top Predictions */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> AI Top Predictions</div>
        <div className="space-y-1.5">
          {aiPredictions.length ? aiPredictions.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-600">{p.label}</span>
                  <span className="font-medium text-slate-700">{Number.isFinite(Number(p.confidence)) ? Math.round(Number(p.confidence) * 100) + "%" : "Score unavailable"}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-300"}`} style={{ width: `${Math.min(100, Math.max(0, Number(p.confidence) * 100 || 0))}%` }} />
                </div>
              </div>
            </div>
          )) : <p className="text-xs text-slate-500">No model predictions are recorded for this image.</p>}
        </div>
      </div>

      {/* Contributing Sensors */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Radar className="w-3 h-3" /> Contributing Sensors (Sensor Fusion)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {sensors.length ? sensors.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded-lg p-2 text-xs ${s.contributing ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>
              {s.contributing ? <Camera className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.type}</div>
                <div className="text-[10px] opacity-70">{s.value}</div>
              </div>
            </div>
          )) : <p className="text-xs text-slate-500">No sensor readings are attached to this record.</p>}
        </div>
      </div>

      {/* Decision Timeline */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Decision Timeline</div>
        <div className="space-y-1">
          {timeline.length ? timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-slate-400 w-10 flex-shrink-0">{t.time}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span className="text-slate-600">{t.event}</span>
            </div>
          )) : <p className="text-xs text-slate-500">No processing timeline is recorded for this sample.</p>}
        </div>
      </div>

      {/* Detection Reason & Recommended Action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-[10px] text-blue-400 uppercase font-medium mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Detection Reason</div>
          <div className="text-xs text-blue-700">{sample.detection_reason || (conf === null ? "No model explanation was recorded." : "Recorded model score: " + conf + "%. This score is not a verified species label.")}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="text-[10px] text-amber-400 uppercase font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Recommended Action</div>
          <div className="text-xs text-amber-700">{sample.recommended_action || "No response recommendation is configured. Keep this observation unverified until a reviewer checks it."}</div>
        </div>
      </div>
    </div>
  );
}
