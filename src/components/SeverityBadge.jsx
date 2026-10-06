import React from "react";
import { Info, AlertCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

const config = {
  info: { icon: Info, classes: "bg-blue-50 text-blue-700 border-blue-200", label: "Info" },
  warning: { icon: AlertCircle, classes: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning" },
  high: { icon: AlertTriangle, classes: "bg-orange-50 text-orange-700 border-orange-200", label: "High" },
  critical: { icon: AlertOctagon, classes: "bg-red-50 text-red-700 border-red-200", label: "Critical" },
};

export default function SeverityBadge({ severity, className }) {
  const cfg = config[severity] || config.info;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.classes, className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}