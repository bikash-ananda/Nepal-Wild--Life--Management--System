import React from "react";
import { ShieldCheck, RefreshCw, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function getConfidenceTier(confidence) {
  const c = (confidence || 0) * 100;
  if (c >= 95) return { tier: "auto", label: "Auto-Accept", color: "emerald", icon: ShieldCheck, desc: "≥95% — Automatically accepted" };
  if (c >= 70) return { tier: "reevaluate", label: "Re-Evaluate", color: "amber", icon: RefreshCw, desc: "70–95% — Combining sensors & frames" };
  return { tier: "human", label: "Human Verification", color: "red", icon: UserCheck, desc: "<70% — Human verification required" };
}

export default function ConfidenceTierBadge({ confidence, size = "sm" }) {
  const { label, color, icon: Icon } = getConfidenceTier(confidence);
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium rounded border", colorMap[color], size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1")}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}