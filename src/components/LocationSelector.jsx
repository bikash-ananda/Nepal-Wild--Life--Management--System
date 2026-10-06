import React, { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const locations = [
  { label: "Kaski, Gandaki Province", value: "kaski" },
  { label: "Kathmandu, Bagmati Province", value: "kathmandu" },
  { label: "Chitwan, Bagmati Province", value: "chitwan" },
  { label: "All Nepal", value: "national" },
];

export default function LocationSelector({ value = "kaski", onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = locations.find((l) => l.value === value) || locations[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium text-slate-700"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.label.split(",")[0]}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
          {locations.map((loc) => (
            <button
              key={loc.value}
              onClick={() => {
                onChange?.(loc.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                loc.value === value ? "text-emerald-700 font-medium" : "text-slate-700"
              )}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {loc.label}
              </span>
              {loc.value === value && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}