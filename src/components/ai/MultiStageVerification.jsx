import React from "react";
import { Camera, Activity, Radar, TrendingUp, Clock, Cloud, History, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  { key: "frames", label: "Multi-Frame Analysis", icon: Layers, desc: "5 consecutive frames" },
  { key: "cameras", label: "Multi-Camera Crosscheck", icon: Camera, desc: "2 cameras" },
  { key: "motion", label: "Motion History", icon: Activity, desc: "Movement pattern" },
  { key: "sensors", label: "Sensor Fusion", icon: Radar, desc: "PIR + Ultrasonic + Radar" },
  { key: "patterns", label: "Animal Movement", icon: TrendingUp, desc: "Corridor match" },
  { key: "history", label: "Historical Activity", icon: History, desc: "Site patterns" },
  { key: "time", label: "Time of Day", icon: Clock, desc: "Dawn/dusk factor" },
  { key: "weather", label: "Weather Conditions", icon: Cloud, desc: "Rain/temperature" },
];

export default function MultiStageVerification({ sample, confidenceScore }) {
  const passed = Math.min(stages.length, Math.floor((confidenceScore || 0) * stages.length * 1.2));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500" /> Multi-Stage Verification
        </div>
        <div className="text-xs text-slate-400">{passed}/{stages.length} stages passed</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stages.map((s, i) => {
          const isPassed = i < passed;
          const Icon = s.icon;
          return (
            <div key={s.key} className={cn(
              "rounded-lg p-2.5 border text-center transition-all",
              isPassed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 opacity-60"
            )}>
              <Icon className={cn("w-4 h-4 mx-auto mb-1", isPassed ? "text-emerald-500" : "text-slate-300")} />
              <div className="text-[10px] font-medium text-slate-600 leading-tight">{s.label}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{s.desc}</div>
              {isPassed && <div className="text-[9px] text-emerald-500 mt-0.5 font-medium">✓ Passed</div>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(passed / stages.length) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-600">{Math.round((passed / stages.length) * 100)}%</span>
      </div>
      <div className="mt-2 text-[10px] text-slate-400">
        Deterrent actions trigger only after the decision engine reaches the required confidence threshold or after human confirmation.
      </div>
    </div>
  );
}