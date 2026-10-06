import React from "react";
import { cn } from "@/lib/utils";

export default function RiskMeter({ score, label = "Risk Score", size = "md" }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const tone = clamped >= 75 ? "text-red-600 bg-red-50" : clamped >= 50 ? "text-orange-600 bg-orange-50" : clamped >= 25 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";
  const barColor = clamped >= 75 ? "bg-red-500" : clamped >= 50 ? "bg-orange-500" : clamped >= 25 ? "bg-amber-500" : "bg-emerald-500";
  const sizes = { sm: "h-1.5", md: "h-2", lg: "h-3" };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</span>
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", tone)}>{Math.round(clamped)}</span>
      </div>
      <div className={cn("w-full rounded-full bg-slate-100 overflow-hidden", sizes[size])}>
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}