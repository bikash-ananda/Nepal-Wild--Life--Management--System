import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";

// Feedback overlay shown after a player submits a vote.
// state: "voting" | "waiting" | "correct" | "needsExpert" | "error"
export default function VoteFeedback({ state, message }) {
  const config = {
    voting: { icon: Clock, color: "text-slate-400", bg: "bg-slate-50", title: "Submitting…", desc: "" },
    waiting: { icon: Clock, color: "text-blue-500", bg: "bg-blue-50", title: "Vote recorded", desc: message || "An authorized reviewer must confirm the label before it is used as evidence." },
    correct: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", title: "Review recorded", desc: message || "Thanks for contributing a review." },
    needsExpert: { icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50", title: "More than one vote recorded", desc: message || "The votes are still unverified. An authorized reviewer must decide the final label." },
    error: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", title: "Couldn't submit", desc: message || "Please try again." },
  };
  const c = config[state] || config.waiting;
  const Icon = c.icon;
  return (
    <AnimatePresence>
      {state && state !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className={`rounded-2xl border border-slate-200 ${c.bg} p-5 text-center`}
        >
          <div className={`mx-auto w-12 h-12 rounded-full ${c.bg} flex items-center justify-center mb-2`}>
            <Icon className={`w-7 h-7 ${c.color}`} />
          </div>
          <div className={`text-base font-bold ${c.color}`}>{c.title}</div>
          {c.desc && <div className="text-xs text-slate-500 mt-1">{c.desc}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
