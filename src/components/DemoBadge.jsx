import React from "react";
import { cn } from "@/lib/utils";

export default function DemoBadge({ label = "DEMO", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
        "bg-amber-50 text-amber-700 border-amber-200",
        className
      )}
    >
      <span className="w-1 h-1 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}