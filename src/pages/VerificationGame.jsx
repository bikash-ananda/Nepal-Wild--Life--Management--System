import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Send, MessageSquarePlus, X, Trophy, ListOrdered, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import GameHUD from "@/components/game/GameHUD";
import SpeciesPicker from "@/components/game/SpeciesPicker";
import VoteFeedback from "@/components/game/VoteFeedback";
import PrivateImage from "@/components/PrivateImage";

export default function VerificationGame() {
  const [sample, setSample] = useState(null);
  const [stats, setStats] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sessionPoints, setSessionPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const pollRef = useRef(null);

  const serveNext = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("verificationGame", { action: "serveNext" });
      setSample(res.sample || null);
      setStats(res.playerStats || null);
      setQueueCount(res.queueCount || 0);
      setLabel("");
      setComment("");
      setShowComment(false);
      setFeedback("idle");
    } catch (e) {
      toast({ title: "Couldn't load next image", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    serveNext();
    // Poll for fresh queue count + new samples every 20s while idle
    pollRef.current = setInterval(() => {
      base44.functions.invoke("verificationGame", { action: "serveNext" }).then((res) => {
        setQueueCount(res.queueCount || 0);
        setStats(res.playerStats || null);
        if (!sample && res.sample) setSample(res.sample);
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!sample || !label) return;
    setSubmitting(true);
    setFeedback("voting");
    try {
      const res = await base44.functions.invoke("verificationGame", {
        action: "submitVote",
        sample_id: sample.id,
        voted_label: label,
        training_comment: comment,
      });
      if (res.confirmed) {
        setFeedback("correct");
        setFeedbackMsg(`+${res.pointsAwarded} points — consensus reached!`);
        setSessionPoints((p) => p + (res.pointsAwarded || 0));
        // Trigger retraining check (best-effort, mirrors AI Verification)
        base44.functions.invoke("yoloRetrain", { action: "checkThreshold" }).catch(() => {});
      } else if (res.consensus && res.consensus.needsExpert) {
        setFeedback("needsExpert");
      } else {
        setFeedback("waiting");
      }
      // Refresh stats
      const st = await base44.functions.invoke("verificationGame", { action: "getPlayerStats" });
      setStats(st.stats || null);
      // After a short pause, advance to the next image
      setTimeout(() => serveNext(), res.confirmed ? 2200 : 2600);
    } catch (e) {
      const msg = e?.message || "Please try again.";
      setFeedback("error");
      setFeedbackMsg(msg);
      toast({ title: "Vote failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const tierBadge = (t) => {
    const map = { common: "bg-slate-100 text-slate-500", rare: "bg-amber-100 text-amber-600", escalated: "bg-red-100 text-red-600" };
    return map[t] || map.common;
  };

  return (
    <div>
      <PageHeader
        title="Verification Game"
        description="Help train the AI — identify wildlife the model couldn't classify. Earn points, climb the leaderboard, and level up."
        icon={Sparkles}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/leaderboard"><Trophy className="w-4 h-4 mr-1" /> Leaderboard</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/expert-review"><ListOrdered className="w-4 h-4 mr-1" /> Expert Review</Link></Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main game column */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
          ) : !sample ? (
            <div className="bg-white rounded-2xl border border-slate-200">
              <EmptyState
                icon={Sparkles}
                title="All caught up!"
                description="No images need verification right now. New captures from the field will appear here automatically — check back soon."
              />
            </div>
          ) : (
            <>
              {/* Image card */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="relative bg-slate-900 min-h-[260px] flex items-center justify-center">
                  <PrivateImage fileUri={sample.image_url} alt="Identify this animal" className="w-full h-full object-cover absolute inset-0" fallbackClassName="w-full h-72" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${tierBadge(sample.difficulty_tier)}`}>
                      {sample.difficulty_tier}
                    </span>
                    {sample.game_mode === "hint_hidden" ? (
                      <span className="text-[10px] font-bold uppercase bg-slate-800 text-white px-2 py-1 rounded">No AI hints</span>
                    ) : sample.ai_label && sample.ai_label !== "Unknown" ? (
                      <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-1 rounded">AI hint: {sample.ai_label}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {feedback !== "idle" && (
                <VoteFeedback state={feedback} points={sessionPoints} message={feedbackMsg} />
              )}

              {/* Picker + submit */}
              {feedback === "idle" || feedback === "voting" ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">What species is this?</label>
                    <SpeciesPicker value={label} onChange={setLabel} disabled={submitting} />
                  </div>

                  {showComment ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-600">Training comment (optional)</label>
                        <button onClick={() => setComment("")} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"><X className="w-3 h-3" /> remove</button>
                      </div>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="e.g. rosette pattern on the flank confirms leopard"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowComment(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Add a training comment
                    </button>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!label || submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Submit identification</>}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Sidebar: HUD + queue */}
        <div className="space-y-4">
          <GameHUD stats={stats} sessionPoints={sessionPoints} />
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-800">{queueCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">images in queue</div>
          </div>
          {stats && stats.badges && stats.badges.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Your badges</div>
              <div className="flex flex-wrap gap-2">
                {stats.badges.map((b) => (
                  <span key={b.id} className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded">{b.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}