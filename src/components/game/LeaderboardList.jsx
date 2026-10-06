import React from "react";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_STYLES = {
  Legend: "from-amber-400 to-yellow-500",
  Master: "from-purple-500 to-fuchsia-500",
  Expert: "from-blue-500 to-indigo-500",
  Ranger: "from-emerald-500 to-teal-500",
  Rookie: "from-slate-400 to-slate-500",
};

// Ranked leaderboard list. Highlights the current player's row.
export default function LeaderboardList({ entries, currentUserId }) {
  if (!entries || !entries.length) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        No players yet — be the first to verify an image!
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const isMe = e.player_id === currentUserId;
        const tier = TIER_STYLES[e.title] || TIER_STYLES.Rookie;
        return (
          <div
            key={e.player_id || e.rank}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              isMe ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
              e.rank === 1 ? "bg-amber-100 text-amber-600" : e.rank === 2 ? "bg-slate-100 text-slate-500" : e.rank === 3 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
            )}>
              {e.rank <= 3 ? <Crown className="w-4 h-4" /> : e.rank}
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
              {(e.player_name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 truncate">{e.player_name}</span>
                {isMe && <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">You</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white bg-gradient-to-r", tier)}>{e.title}</span>
                <span className="text-[10px] text-slate-400">{e.verified_count} verified</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                {e.points}
              </div>
              <div className="text-[10px] text-slate-400">points</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}