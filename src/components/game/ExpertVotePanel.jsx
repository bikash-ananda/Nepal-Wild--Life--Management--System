import React, { useState } from "react";
import { CheckCircle2, Edit3, SkipForward, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PrivateImage from "@/components/PrivateImage";
import { cn } from "@/lib/utils";

// Expert review panel for a single sample: image, vote distribution, each
// player's vote + training comment, and confirm / override controls.
export default function ExpertVotePanel({ sample, onConfirm, onOverride, onSkip, busy }) {
  const [overrideLabel, setOverrideLabel] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const votes = sample.votes || [];
  const counts = {};
  for (const v of votes) counts[v.voted_label] = (counts[v.voted_label] || 0) + 1;
  const sortedLabels = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const consensus = sample.consensus_label || sortedLabels[0]?.[0] || "";
  const maxCount = sortedLabels[0]?.[1] || 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative bg-slate-900 min-h-[240px] flex items-center justify-center">
          <PrivateImage fileUri={sample.image_url} alt="Sample" className="w-full h-full object-cover absolute inset-0" fallbackClassName="w-full h-64" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="text-[10px] font-bold uppercase bg-amber-500 text-white px-2 py-1 rounded">{sample.difficulty_tier}</span>
            {sample.game_mode === "hint_hidden" && <span className="text-[10px] font-bold uppercase bg-slate-800 text-white px-2 py-1 rounded">No hints</span>}
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium mb-2">Vote distribution</div>
            <div className="space-y-2">
              {sortedLabels.map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="text-slate-400">{count} vote{count > 1 ? "s" : ""} ({Math.round((count / votes.length) * 100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", label === consensus ? "bg-emerald-500" : "bg-slate-300")}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium mb-2">Player votes</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {votes.map((v) => (
                <div key={v.id} className="rounded-lg bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{v.player_name}</span>
                    <span className="text-xs font-bold text-emerald-600">{v.voted_label}</span>
                  </div>
                  {v.training_comment && (
                    <div className="flex items-start gap-1 mt-1 text-[11px] text-slate-500">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                      <span>{v.training_comment}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4 space-y-3">
        {showOverride ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Override with correct label:</label>
            <div className="flex gap-2">
              <input
                value={overrideLabel}
                onChange={(e) => setOverrideLabel(e.target.value)}
                placeholder="Enter the correct species…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-emerald-200"
              />
              <Button onClick={() => onOverride(overrideLabel || consensus)} disabled={busy || !overrideLabel}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
            <button onClick={() => setShowOverride(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel override</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onConfirm()} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Confirm “{consensus}”
            </Button>
            <Button variant="outline" onClick={() => setShowOverride(true)} disabled={busy}>
              <Edit3 className="w-4 h-4 mr-1" /> Override
            </Button>
            {onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={busy}>
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}