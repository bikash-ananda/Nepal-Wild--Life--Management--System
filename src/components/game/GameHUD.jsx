import React from "react";
import { Flame, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact heads-up display for the verification game: level title, total points,
// current streak, and a progress bar toward the next level.
export default function GameHUD({ stats, sessionPoints = 0 }) {
  if (!stats) return null;
  const { level, title, progress, points_to_next, next_title, total_points, current_streak } = stats;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {level}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight">{title}</div>
            <div className="text-[10px] text-slate-400">Level {level}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-lg leading-none">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {total_points}
            </div>
            <div className="text-[10px] text-slate-400">total points</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-orange-500 font-bold text-lg leading-none">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-500" />
              {current_streak}
            </div>
            <div className="text-[10px] text-slate-400">streak</div>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{sessionPoints > 0 && <span className="text-emerald-600 font-semibold">+{sessionPoints} this session</span>}</span>
          <span>{next_title ? `${points_to_next} pts to ${next_title}` : "Max level reached"}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}