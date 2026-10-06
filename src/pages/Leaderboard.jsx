import React, { useState, useEffect } from "react";
import { Loader2, Trophy, Gamepad2, Award } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import LeaderboardList from "@/components/game/LeaderboardList";
import BadgeGallery from "@/components/game/BadgeGallery";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    try {
      const [lb, st] = await Promise.all([
        base44.functions.invoke("verificationGame", { action: "getLeaderboard" }),
        base44.functions.invoke("verificationGame", { action: "getPlayerStats" }),
      ]);
      setLeaderboard(lb.leaderboard || []);
      setStats(st.stats || null);
    } catch (e) {
      toast({ title: "Couldn't load leaderboard", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentUserId = stats ? (leaderboard.find((e) => e.isMe)?.player_id) : null;

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Top wildlife identifiers in the verification game. Climb the ranks by correctly classifying images the AI couldn't."
        icon={Trophy}
      />

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Your stats card */}
            {stats && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase opacity-80">Your level</div>
                    <div className="text-2xl font-bold">{stats.title}</div>
                    <div className="text-xs opacity-80 mt-0.5">{stats.total_points} points · {stats.verified_count} verified · {stats.accuracy_pct}% accuracy</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-bold justify-end"><Trophy className="w-5 h-5" /> {stats.total_points}</div>
                    <div className="text-xs opacity-80">current streak: {stats.current_streak} · best: {stats.best_streak}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${stats.progress}%` }} />
                </div>
                <div className="text-[10px] opacity-80 mt-1">
                  {stats.next_title ? `${stats.points_to_next} points to ${stats.next_title}` : "Maximum level reached"}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700">Top players</span>
              </div>
              <LeaderboardList entries={leaderboard} currentUserId={currentUserId} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-700">Badges</span>
              </div>
              <BadgeGallery earnedIds={(stats?.badges || []).map((b) => b.id)} />
            </div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <Gamepad2 className="w-4 h-4" />
                <span className="text-sm font-semibold">How points work</span>
              </div>
              <ul className="text-xs text-emerald-600/80 space-y-1">
                <li>• Common species: 10 pts (hint shown)</li>
                <li>• No-hint mode: 1.5× multiplier</li>
                <li>• Rare / threatened species: 2× pts</li>
                <li>• Escalated images: 3× pts</li>
                <li>• No penalty for wrong answers — just play!</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}