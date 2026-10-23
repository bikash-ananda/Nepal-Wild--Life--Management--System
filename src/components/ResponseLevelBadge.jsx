import React from "react";
import { cn } from "@/lib/utils";

const levelConfig = {
  0: { name: "Monitoring", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", desc: "Normal monitoring" },
  1: { name: "Early Warning", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", desc: "Pre-notice before entry" },
  2: { name: "Prevention", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", desc: "Active deterrence" },
  3: { name: "Active Response", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500", desc: "Full deterrent deployment" },
  4: { name: "Emergency", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", desc: "Multi-stakeholder alert" },
};

export default function ResponseLevelBadge({ level, showDesc = false, className = "" }) {
  const cfg = levelConfig[level] ?? levelConfig[0];
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium", cfg.color, className)}>
      <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
      <span>L{level} · {cfg.name}</span>
      {showDesc && <span className="text-[10px] opacity-70 hidden sm:inline">— {cfg.desc}</span>}
    </div>
  );
}

export { levelConfig };
