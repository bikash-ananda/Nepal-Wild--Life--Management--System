import React, { useState, useEffect, useCallback } from "react";
import { Loader2, ListOrdered, CheckCircle2, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import ExpertVotePanel from "@/components/game/ExpertVotePanel";
import PrivateImage from "@/components/PrivateImage";
import { cn } from "@/lib/utils";

export default function ExpertReview() {
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("verificationGame", { action: "reviewQueue" });
      setQueue(res.queue || []);
      if (!selectedId && (res.queue || []).length) setSelectedId(res.queue[0].id);
    } catch (e) {
      toast({ title: "Couldn't load review queue", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedId, toast]);

  useEffect(() => { load(); }, [load]);

  const selected = queue.find((s) => s.id === selectedId);

  const refreshAfter = () => {
    setBusy(true);
    setTimeout(async () => {
      await load();
      setBusy(false);
    }, 800);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await base44.functions.invoke("verificationGame", { action: "confirmLabel", sample_id: selected.id });
      base44.functions.invoke("yoloRetrain", { action: "checkThreshold" }).catch(() => {});
      toast({ title: "Label confirmed", description: `Verified as ${selected.consensus_label}. Voters awarded points.` });
      refreshAfter();
    } catch (e) {
      setBusy(false);
      toast({ title: "Confirm failed", description: e.message, variant: "destructive" });
    }
  };

  const handleOverride = async (label) => {
    if (!selected || !label) return;
    setBusy(true);
    try {
      await base44.functions.invoke("verificationGame", { action: "overrideLabel", sample_id: selected.id, label });
      base44.functions.invoke("yoloRetrain", { action: "checkThreshold" }).catch(() => {});
      toast({ title: "Label overridden", description: `Verified as ${label}. Matching voters awarded points.` });
      refreshAfter();
    } catch (e) {
      setBusy(false);
      toast({ title: "Override failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSkip = async () => {
    if (!selected) return;
    setSelectedId(null);
    const next = queue.find((s) => s.id !== selected.id);
    if (next) setSelectedId(next.id);
  };

  return (
    <div>
      <PageHeader
        title="Expert Review"
        description="High-value and low-agreement classifications need a senior verifier to confirm the ground truth before they feed model retraining."
        icon={ListOrdered}
      />

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
      ) : !queue.length ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={CheckCircle2} title="Nothing to review" description="No samples are awaiting expert confirmation. Consensus from the game will appear here automatically." />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Queue list */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase px-1">{queue.length} awaiting review</div>
            {queue.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                  s.id === selectedId ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  <PrivateImage fileUri={s.image_url} alt="" className="w-full h-full object-cover" fallbackClassName="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">{s.consensus_label || "No consensus"}</div>
                  <div className="text-[10px] text-slate-400">{s.vote_count || 0} votes · {s.difficulty_tier}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>

          {/* Review panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <ExpertVotePanel
                sample={selected}
                onConfirm={handleConfirm}
                onOverride={handleOverride}
                onSkip={handleSkip}
                busy={busy}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                Select a sample to review.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}