import React from "react";
import { Brain, Radar, Camera, Clock, Lightbulb, Target, TrendingUp, Cloud } from "lucide-react";

export default function ExplainableAIPanel({ sample }) {
  if (!sample) return null;
  const conf = Math.round((sample.ai_confidence || 0) * 100);
  const aiPredictions = sample.ai_predictions || [
    { label: sample.ai_label || "Unknown", confidence: sample.ai_confidence || 0.68 },
    { label: "Langur", confidence: 0.18 },
    { label: "Human", confidence: 0.08 },
    { label: "Dog", confidence: 0.04 },
  ];

  const sensors = sample.sensor_readings || [
    { type: "PIR Motion", value: "Detected", contributing: true },
    { type: "Ultrasonic", value: "3.2 kHz", contributing: true },
    { type: "Camera Frame 3/5", value: "Consistent", contributing: true },
    { type: "Radar", value: "No return", contributing: false },
  ];

  const timeline = sample.decision_timeline || [
    { time: "0.0s", event: "PIR motion triggered" },
    { time: "0.3s", event: "Camera frame 1 captured" },
    { time: "0.6s", event: "AI inference: 68% confidence" },
    { time: "0.9s", event: "Frame 2-3 captured, tracking active" },
    { time: "1.2s", event: "Confidence <70% — queued for human verification" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Brain className="w-4 h-4 text-purple-500" /> Explainable AI — Detection Reasoning
      </div>

      {/* AI Top Predictions */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> AI Top Predictions</div>
        <div className="space-y-1.5">
          {aiPredictions.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-600">{p.label}</span>
                  <span className="font-medium text-slate-700">{Math.round((p.confidence || 0) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-300"}`} style={{ width: `${(p.confidence || 0) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contributing Sensors */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Radar className="w-3 h-3" /> Contributing Sensors (Sensor Fusion)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {sensors.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded-lg p-2 text-xs ${s.contributing ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>
              {s.contributing ? <Camera className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.type}</div>
                <div className="text-[10px] opacity-70">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Timeline */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase font-medium mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Decision Timeline</div>
        <div className="space-y-1">
          {timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-slate-400 w-10 flex-shrink-0">{t.time}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span className="text-slate-600">{t.event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detection Reason & Recommended Action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-[10px] text-blue-400 uppercase font-medium mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Detection Reason</div>
          <div className="text-xs text-blue-700">{sample.detection_reason || `Low confidence (${conf}%) on primary prediction. Sensor fusion shows partial agreement — PIR and ultrasonic confirmed motion, but radar returned no signal. Object tracking active across 3 frames.`}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="text-[10px] text-amber-400 uppercase font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Recommended Action</div>
          <div className="text-xs text-amber-700">{sample.recommended_action || `Hold deterrent activation. Continue tracking with additional frames. Queue for human verification before any response action is taken.`}</div>
        </div>
      </div>
    </div>
  );
}