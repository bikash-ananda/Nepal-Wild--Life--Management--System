import React from "react";
import { Footprints, Award, Eye, Sparkles, Flame, Target, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_BADGES = [
  { id: "first_steps", name: "First Steps", description: "Verify your first image", icon: Footprints },
  { id: "century", name: "Century", description: "Verify 100 images", icon: Award },
  { id: "sharp_eye", name: "Sharp Eye", description: "90%+ accuracy over 20 votes", icon: Eye },
  { id: "rare_hunter", name: "Rare Species Hunter", description: "10 rare-species correct votes", icon: Sparkles },
  { id: "on_fire", name: "On Fire", description: "25 correct-vote streak", icon: Flame },
  { id: "dedicated", name: "Dedicated", description: "Cast 50 votes", icon: Target },
];

// Badge gallery with locked / unlocked states.
export default function BadgeGallery({ earnedIds = [] }) {
  const earned = new Set(earnedIds);
  return (
    <div className="grid grid-cols-3 gap-3">
      {ALL_BADGES.map((b) => {
        const Icon = b.icon;
        const unlocked = earned.has(b.id);
        return (
          <div
            key={b.id}
            className={cn(
              "rounded-xl border p-3 text-center transition-all",
              unlocked ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"
            )}
          >
            <div className={cn(
              "mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-1.5",
              unlocked ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md" : "bg-slate-200 text-slate-400"
            )}>
              {unlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
            </div>
            <div className={cn("text-[11px] font-bold leading-tight", unlocked ? "text-slate-700" : "text-slate-400")}>{b.name}</div>
            <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{b.description}</div>
          </div>
        );
      })}
    </div>
  );
}