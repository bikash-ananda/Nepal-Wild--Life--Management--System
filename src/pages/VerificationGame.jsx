import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Send, MessageSquarePlus, X, ListOrdered, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
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
  const [sessionVoteCount, setSessionVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const votedIdsRef = useRef(new Set());
  const advanceTimeoutRef = useRef(null);

  const serveNext = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.functions.invoke("verificationGame", { action: "reviewQueue" });
      const queue = res.queue || [];
      setSample(queue.find((item) => !votedIdsRef.current.has(item.id)) || null);
      setQueueCount(queue.length);
      try {
        const statsResult = await api.functions.invoke("verificationGame", { action: "getPlayerStats" });
        setStats(statsResult.stats || null);
      } catch {
        setStats(null);
      }
      setLabel("");
      setComment("");
      setShowComment(false);
      setFeedback("idle");
    } catch (e) {
      setError(e.message || "The review queue could not be loaded.");
      toast({ title: "Couldn't load next image", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshQueue = () => {
    window.clearTimeout(advanceTimeoutRef.current);
    return serveNext();
  };

  useEffect(() => {
    serveNext();
    return () => window.clearTimeout(advanceTimeoutRef.current);
  }, [serveNext]);

  const handleSubmit = async () => {
    if (!sample || !label) return;
    setSubmitting(true);
    setFeedback("voting");
    try {
      const res = await api.functions.invoke("verificationGame", {
        action: "submitVote",
        sample_id: sample.id,
        voted_label: label,
        training_comment: comment,
      });
      votedIdsRef.current.add(sample.id);
      setSessionVoteCount((count) => count + 1);
      if (res.consensus && res.consensus.needsExpert) {
        setFeedback("needsExpert");
      } else {
        setFeedback("waiting");
      }
      setFeedbackMsg("Your vote is recorded. It is not a confirmed label and does not train the model.");
      try {
        const st = await api.functions.invoke("verificationGame", { action: "getPlayerStats" });
        setStats(st.stats || null);
      } catch {
        // A vote remains saved even when the optional stats refresh is unavailable.
      }
      advanceTimeoutRef.current = window.setTimeout(() => serveNext(), 2400);
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
        title="Community Image Review"
        description="Suggest a label for an unverified image. Votes help organize review but do not confirm a species or train the model; an authorized reviewer must decide."
        icon={Sparkles}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/expert-review"><ListOrdered className="w-4 h-4 mr-1" /> Expert Review</Link></Button>
            <Button variant="outline" size="sm" onClick={refreshQueue} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" /> Refresh queue</Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main game column */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refreshQueue}>Try again</Button>
            </div>
          ) : !sample ? (
            <div className="bg-white rounded-2xl border border-slate-200">
              <EmptyState
                icon={Sparkles}
                title={sessionVoteCount > 0 ? "You reviewed the available images" : "No images waiting for review"}
                description={sessionVoteCount > 0 ? "Your votes remain unverified. Refresh later for new images, or review this batch again." : "New field captures appear after they are submitted. This page does not classify images automatically."}
              />
              {sessionVoteCount > 0 && <div className="pb-5 text-center"><Button variant="outline" onClick={() => { window.clearTimeout(advanceTimeoutRef.current); votedIdsRef.current.clear(); setSessionVoteCount(0); serveNext(); }}>Review this batch again</Button></div>}
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
                <VoteFeedback state={feedback} message={feedbackMsg} />
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
                        <label className="text-xs font-medium text-slate-600">Research note (optional)</label>
                        <button onClick={() => setComment("")} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"><X className="w-3 h-3" /> remove</button>
                      </div>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional note to help an authorized reviewer assess this image."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowComment(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Add a research note
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
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-800">{queueCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">pending images loaded (up to 100)</div>
            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <div className="flex justify-between gap-2"><span>Votes recorded by you</span><strong>{stats?.votes ?? "—"}</strong></div>
              <div className="mt-1 flex justify-between gap-2"><span>Votes this session</span><strong>{sessionVoteCount}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
