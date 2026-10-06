import React from "react";
import { cn } from "@/lib/utils";

const toneStyles = {
  online: "bg-emerald-100 text-emerald-700",
  offline: "bg-red-100 text-red-700",
  degraded: "bg-amber-100 text-amber-700",
  healthy: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  maintenance: "bg-amber-100 text-amber-700",
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  false_alarm: "bg-slate-100 text-slate-600",
  resolved: "bg-slate-100 text-slate-600",
  synced: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  calibrating: "bg-blue-100 text-blue-700",
  info: "bg-blue-100 text-blue-700",
};

export default function StatusBadge({ status, className }) {
  const style = toneStyles[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize", style, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {status?.replace(/_/g, " ")}
    </span>
  );
}