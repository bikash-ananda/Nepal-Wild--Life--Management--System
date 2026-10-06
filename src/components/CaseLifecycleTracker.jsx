import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, ShieldCheck, Users, Wrench, Check, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_FLOW = [
  { key: "reported", label: "Reported", icon: ClipboardList },
  { key: "verified", label: "Verified", icon: ShieldCheck },
  { key: "assigned", label: "Assigned", icon: Users },
  { key: "in_progress", label: "In Progress", icon: Wrench },
  { key: "resolved", label: "Resolved", icon: Check },
  { key: "closed", label: "Closed", icon: Archive },
];

const EASE = [0.22, 1, 0.36, 1];

export default function CaseLifecycleTracker({ status, onStatusChange, flow = DEFAULT_FLOW }) {
  const currentIndex = Math.max(0, flow.findIndex((s) => s.key === status));
  const interactive = typeof onStatusChange === "function";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-800">Case Lifecycle</h3>
        <span className="text-xs font-medium text-emerald-600">
          Step {currentIndex + 1} / {flow.length}
        </span>
      </div>

      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-start min-w-[640px]">
          {flow.map((step, i) => {
            const completed = i < currentIndex;
            const current = i === currentIndex;
            const Icon = step.icon;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && <Connector filled={i <= currentIndex} />}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => interactive && onStatusChange(step.key)}
                  className={cn("flex flex-col items-center gap-2 group", interactive && "cursor-pointer")}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: current ? 1.12 : 1,
                      backgroundColor: completed || current ? "hsl(var(--primary))" : "hsl(var(--background))",
                      borderColor: current ? "hsl(var(--secondary))" : completed ? "hsl(var(--primary))" : "hsl(var(--border))",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center border-2"
                  >
                    {current && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-emerald-400"
                        animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <AnimatePresence mode="wait" initial={false}>
                      {completed ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        >
                          <Check className="w-5 h-5 text-white" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="icon"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        >
                          <Icon className={cn("w-5 h-5", current ? "text-white" : "text-slate-400")} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap transition-colors",
                      current ? "text-emerald-700" : completed ? "text-slate-600" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {interactive ? "Tap a stage to update the case status." : "Tracking case progress from report to resolution."}
      </p>
    </div>
  );
}

function Connector({ filled }) {
  return (
    <div className="flex-1 h-0.5 mx-1 mt-5 bg-slate-200 rounded-full overflow-hidden relative">
      <motion.div
        className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
        initial={false}
        animate={{ width: filled ? "100%" : "0%" }}
        transition={{ duration: 0.6, ease: EASE }}
      />
    </div>
  );
}