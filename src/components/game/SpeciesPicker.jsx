import React, { useState, useEffect, useRef } from "react";
import { Search, Check, Leaf } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

// Searchable species picker for the verification game. Loads active species and
// lets the player search by name; also supports a free-text "Other / Unknown"
// fallback for species not in the registry.
export default function SpeciesPicker({ value, onChange, disabled }) {
  const [species, setSpecies] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Species.filter({ active: true }, { limit: 200, fields: ["name", "scientific_name", "conservation_status"] })
      .then((page) => {
        const items = page.items || page || [];
        setSpecies(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? species.filter((s) => (s.name || "").toLowerCase().includes(query.toLowerCase()))
    : species;

  const select = (name) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-300",
          value ? "border-emerald-300 bg-emerald-50/40" : ""
        )}
      >
        <span className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-500" />
          <span className={cn("text-sm font-medium", value ? "text-slate-800" : "text-slate-400")}>
            {value || "Select the species…"}
          </span>
        </span>
        <Search className="w-4 h-4 text-slate-300" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search species…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 outline-none focus:ring-2 ring-emerald-200"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading species…</div>
            ) : filtered.length === 0 ? (
              <button
                onClick={() => select(query || "Unknown")}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Use “{query || "Unknown"}”
              </button>
            ) : (
              filtered.slice(0, 60).map((s) => {
                const rare = ["vulnerable", "endangered", "critically_endangered"].includes(s.conservation_status);
                return (
                  <button
                    key={s.id}
                    onClick={() => select(s.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-700">{s.name}</div>
                      {s.scientific_name && <div className="text-[10px] text-slate-400 italic">{s.scientific_name}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {rare && <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Rare</span>}
                      {value === s.name && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </button>
                );
              })
            )}
            <button
              onClick={() => select("Unknown")}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 border-t border-slate-100"
            >
              Other / Unknown
            </button>
          </div>
        </div>
      )}
    </div>
  );
}